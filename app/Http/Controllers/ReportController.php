<?php

namespace App\Http\Controllers;

use App\Models\Enquiry;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Inertia\Inertia;

class ReportController extends Controller
{
    private const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    private const STATUSES = ['New', 'Contacted', 'Meeting', '1st Deposit', '2nd Deposit', 'Cold', 'Lost'];

    public function reports(Request $request)
    {
        $isSales = auth()->user()?->hasRole('Sales');
        $userId  = auth()->id();

        $base = Enquiry::query();
        if ($isSales) {
            $base->where('user_id', $userId);
        }

        $availableYears = (clone $base)->selectRaw('YEAR(date) as year')
            ->whereNotNull('date')
            ->groupBy('year')
            ->orderByDesc('year')
            ->pluck('year')
            ->toArray();

        $year = (int) $request->get('year', $availableYears[0] ?? date('Y'));

        $yearBase = (clone $base)->whereYear('date', $year);

        // Monthly enquiry counts (all 12 months, filling 0 where no data)
        $monthlyCounts = (clone $yearBase)->selectRaw('MONTH(date) as month, COUNT(*) as count')
            ->groupBy('month')
            ->pluck('count', 'month');

        $monthlyData = collect(range(1, 12))->map(fn ($m) => [
            'month' => self::MONTHS[$m - 1],
            'count' => (int) $monthlyCounts->get($m, 0),
        ])->values();

        // Type breakdown
        $typeData = (clone $yearBase)->selectRaw('type, COUNT(*) as count')
            ->whereNotNull('type')
            ->where('type', '!=', '')
            ->groupBy('type')
            ->orderByDesc('count')
            ->get()
            ->map(fn ($row) => ['type' => $row->type, 'count' => (int) $row->count]);

        // Lead source breakdown (using `source` column)
        $sourceData = (clone $yearBase)->selectRaw('source, COUNT(*) as count')
            ->whereNotNull('source')
            ->where('source', '!=', '')
            ->groupBy('source')
            ->orderByDesc('count')
            ->get()
            ->map(fn ($row) => ['source' => $row->source, 'count' => (int) $row->count]);

        // Rep performance (users with enquiry counts for this year)
        $repData = User::withCount([
            'enquiries as count' => fn ($q) => $q->whereYear('date', $year)->when($isSales, fn ($q) => $q->where('enquiries.user_id', $userId)),
        ])->orderBy('name')->get()->map(fn (User $user) => [
            'name'  => $user->name,
            'count' => (int) $user->count,
            'color' => $user->color ?? 0,
        ]);

        // Unassigned count for the year (Sales sees none, they only see assigned)
        if (! $isSales) {
            $unassignedCount = (clone $yearBase)->whereNull('user_id')->count();
            if ($unassignedCount > 0) {
                $repData->push(['name' => 'Unassigned', 'count' => $unassignedCount, 'color' => -1]);
            }
        }

        // Deposits are counted by the year they were taken (dep1_date/dep2_date), not the
        // enquiry's original date, so a deposit shows up in the year it actually happened.
        $depositsThisYear = (clone $base)->where(function ($query) use ($year) {
            $query->where(fn ($q) => $q->where('status', '1st Deposit')->whereYear('dep1_date', $year))
                ->orWhere(fn ($q) => $q->where('status', '2nd Deposit')->whereYear('dep2_date', $year));
        })->count();

        // Year totals for summary stats
        $totals = [
            'total'    => (clone $yearBase)->count(),
            'meetings' => (clone $yearBase)->where('status', 'Meeting')->count(),
            'deposits' => $depositsThisYear,
            'lost'     => (clone $yearBase)->where('status', 'Lost')->count(),
        ];

        return Inertia::render('reports', [
            'year'           => $year,
            'availableYears' => $availableYears,
            'monthlyData'    => $monthlyData,
            'typeData'       => $typeData,
            'sourceData'     => $sourceData,
            'repData'        => $repData->values(),
            'totals'         => $totals,
        ]);
    }

    public function repReport()
    {
        $isSuperAdmin = auth()->user()?->hasRole('Super Admin');
        $isAdmin      = auth()->user()?->hasRole('Admin');
        $isSales      = ! $isSuperAdmin && ! $isAdmin;
        $userId       = auth()->id();

        $now          = now();
        $threshold4h  = $now->copy()->subHours(4);
        $threshold24h = $now->copy()->subHours(24);

        $usersQuery = User::with([
            'enquiries' => fn ($query) => $query
                ->with(['followUps.user', 'assignedUser'])
                ->orderByDesc('date')
                ->orderByDesc('id'),
        ])->orderBy('name');

        if ($isSales) {
            $usersQuery->where('id', $userId);
        }

        $users = $usersQuery->get();

        $allUsers = User::orderBy('name')->get()->map(fn (User $user) => [
            'id'     => $user->id,
            'name'   => $user->name,
            'email'  => $user->email,
            'title'  => $user->title,
            'phone'  => $user->phone,
            'status' => $user->status,
            'color'  => $user->color ?? 0,
        ]);

        $baseEnq = Enquiry::query();
        if ($isSales) {
            $baseEnq->where('user_id', $userId);
        }

        $summary = [
            'total'       => (clone $baseEnq)->count(),
            'newToday'    => (clone $baseEnq)->whereDate('date', $now->toDateString())->count(),
            'newWeek'     => (clone $baseEnq)->where('date', '>=', $now->copy()->subDays(7)->startOfDay())->count(),
            'meetings'    => (clone $baseEnq)->where('status', 'Meeting')->count(),
            'deposits'    => (clone $baseEnq)->whereIn('status', ['1st Deposit', '2nd Deposit'])->count(),
        ];

        $reps = $users->map(function (User $user) use ($now, $threshold4h, $threshold24h) {
            $statusCounts = array_fill_keys(self::STATUSES, 0);

            $enquiries = $user->enquiries->map(function ($enquiry) use ($now, $threshold4h, $threshold24h, &$statusCounts) {
                if (isset($statusCounts[$enquiry->status])) {
                    $statusCounts[$enquiry->status]++;
                }

                $alertLevel = 'ok';
                $elapsed    = null;

                if ($enquiry->status === 'New' && $enquiry->first_contact_timestamp) {
                    $hasResponse = $enquiry->followUps->isNotEmpty() || ! empty($enquiry->fu);
                    if (! $hasResponse) {
                        $ts      = $enquiry->first_contact_timestamp;
                        $elapsed = $this->fmtElapsed($now->diffInSeconds($ts, false));
                        if ($ts->lte($threshold24h)) {
                            $alertLevel = 'urgent';
                        } elseif ($ts->lte($threshold4h)) {
                            $alertLevel = 'warning';
                        }
                    }
                }

                $ts = $enquiry->first_contact_timestamp;

                return [
                    'id'                    => $enquiry->id,
                    'contactform7_id'       => $enquiry->contactform7_id ?? '',
                    'cf7_status'            => $enquiry->cf7_status ?? '',
                    'date'                  => $enquiry->date?->format('Y-m-d'),
                    'name'                  => $enquiry->name,
                    'phone'                 => $enquiry->phone ?? '',
                    'email'                 => $enquiry->email ?? '',
                    'postcode'              => $enquiry->postcode ?? '',
                    'source'                => $enquiry->source ?? '',
                    'where_did_you_hear'    => $enquiry->where_did_you_hear ?? '',
                    'lead'                  => $enquiry->lead ?? '',
                    'type'                  => $enquiry->type ?? '',
                    'interested'            => $enquiry->interested ?? '',
                    'loc'                   => $enquiry->loc ?? '',
                    'rep'                   => $enquiry->rep ?? '',
                    'status'                => $enquiry->status,
                    'dep1'                  => $enquiry->dep1 ?? 'NO',
                    'dep1_date'             => $enquiry->dep1_date?->format('Y-m-d'),
                    'dep2'                  => $enquiry->dep2 ?? 'NO',
                    'dep2_date'             => $enquiry->dep2_date?->format('Y-m-d'),
                    'notes'                 => $enquiry->notes ?? '',
                    'design_name'           => $enquiry->design_name ?? '',
                    'alt_s'                 => $enquiry->alt_s ?? '',
                    'ajxizl7033'            => $enquiry->ajxizl7033 ?? '',
                    'message'               => $enquiry->message ?? '',
                    'join_email_list'       => (bool) $enquiry->join_email_list,
                    'fu'                    => $enquiry->fu ?? '',
                    'firstContactTimestamp' => $ts?->toISOString(),
                    'files'                 => $enquiry->files ?? [],
                    'files_count'           => $enquiry->files_count ?? 0,
                    'user_id'               => $enquiry->user_id,
                    'assignedUser'          => $enquiry->assignedUser ? [
                        'id'     => $enquiry->assignedUser->id,
                        'name'   => $enquiry->assignedUser->name,
                        'email'  => $enquiry->assignedUser->email,
                        'title'  => $enquiry->assignedUser->title,
                        'phone'  => $enquiry->assignedUser->phone,
                        'status' => $enquiry->assignedUser->status,
                        'color'  => $enquiry->assignedUser->color ?? 0,
                    ] : null,
                    'followUps'             => $enquiry->followUps->map(fn ($fu) => [
                        'id'        => $fu->id,
                        'date'      => $fu->date?->format('Y-m-d'),
                        'message'   => $fu->message,
                        'file_name' => $fu->file_name,
                        'file_size' => $fu->file_size,
                        'file_mime' => $fu->file_mime,
                        'user_name' => $fu->user?->name,
                    ]),
                    'alertLevel'            => $alertLevel,
                    'elapsed'               => $elapsed,
                ];
            });

            return [
                'id'           => $user->id,
                'name'         => $user->name,
                'title'        => $user->title ?? 'Sales Consultant',
                'email'        => $user->email,
                'phone'        => $user->phone ?? '',
                'color'        => $user->color ?? 0,
                'statusCounts' => $statusCounts,
                'urgentCount'  => $enquiries->where('alertLevel', 'urgent')->count(),
                'warningCount' => $enquiries->where('alertLevel', 'warning')->count(),
                'enquiries'    => $enquiries->values(),
            ];
        });

        $summary['totalAlerts'] = $reps->sum('urgentCount') + $reps->sum('warningCount');

        return Inertia::render('rep-report', [
            'summary' => $summary,
            'reps'    => $reps->values(),
            'users'   => $allUsers->values(),
        ]);
    }

    private function fmtElapsed(int $diffSeconds): string
    {
        $diff = abs($diffSeconds);
        if ($diff < 3600)  return floor($diff / 60) . 'm ago';
        if ($diff < 86400) return floor($diff / 3600) . 'h ago';
        return floor($diff / 86400) . 'd ago';
    }

    public function statusReport(Request $request)
    {
        $isSales = auth()->user()?->hasRole('Sales');
        $userId  = auth()->id();

        $roleBase = Enquiry::query();
        if ($isSales) {
            $roleBase->where('user_id', $userId);
        }

        // Build list of available year-month combos
        $availableMonths = (clone $roleBase)->selectRaw('YEAR(date) as yr, MONTH(date) as mo')
            ->whereNotNull('date')
            ->groupBy('yr', 'mo')
            ->orderByDesc('yr')
            ->orderByDesc('mo')
            ->get()
            ->map(fn ($row) => [
                'value' => $row->yr . '-' . str_pad($row->mo, 2, '0', STR_PAD_LEFT),
                'label' => self::MONTHS[(int) $row->mo - 1] . ' ' . $row->yr,
            ])
            ->values();

        $selectedMonth = $request->get('month', 'all');

        // Base query filtered by selected month
        $baseQuery = clone $roleBase;
        if ($selectedMonth !== 'all' && preg_match('/^\d{4}-\d{2}$/', $selectedMonth)) {
            [$yr, $mo] = explode('-', $selectedMonth);
            $baseQuery->whereYear('date', $yr)->whereMonth('date', $mo);
        }

        $filteredTotal = (clone $baseQuery)->count();

        $statusCounts = (clone $baseQuery)
            ->selectRaw('status, COUNT(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status');

        $statusData = collect(self::STATUSES)->map(fn ($status) => [
            'status' => $status,
            'count'  => (int) $statusCounts->get($status, 0),
            'pct'    => $filteredTotal > 0
                ? (int) round($statusCounts->get($status, 0) / $filteredTotal * 100)
                : 0,
        ])->values();

        // Monthly status flow — always all time, grouped by year-month.
        // Deposit rows are bucketed by the month the deposit was taken (dep1_date/dep2_date),
        // not the enquiry's original date, so they land in the month they actually happened.
        $effectiveDate = "COALESCE(CASE WHEN status = '1st Deposit' THEN dep1_date WHEN status = '2nd Deposit' THEN dep2_date ELSE date END, date)";
        $flowRaw = (clone $roleBase)->selectRaw("YEAR($effectiveDate) as yr, MONTH($effectiveDate) as mo, status, COUNT(*) as count")
            ->whereNotNull('date')
            ->groupBy('yr', 'mo', 'status')
            ->orderBy('yr')
            ->orderBy('mo')
            ->get();

        $monthlyFlow = $flowRaw
            ->groupBy(fn ($row) => $row->yr . '-' . str_pad($row->mo, 2, '0', STR_PAD_LEFT))
            ->map(function (Collection $rows, string $key) {
                [$yr, $mo] = explode('-', $key);
                $entry = ['label' => self::MONTHS[(int) $mo - 1] . ' ' . $yr];
                foreach (self::STATUSES as $status) {
                    $entry[$status] = (int) ($rows->firstWhere('status', $status)?->count ?? 0);
                }
                return $entry;
            })
            ->values();

        // Overall totals
        $totals = [
            'total'    => (clone $roleBase)->count(),
            'active'   => (clone $roleBase)->whereNotIn('status', ['Cold', 'Lost'])->count(),
            'closed'   => (clone $roleBase)->where('status', 'Cold')->count(),
            'lost'     => (clone $roleBase)->where('status', 'Lost')->count(),
            'deposits' => (clone $roleBase)->whereIn('status', ['1st Deposit', '2nd Deposit'])->count(),
        ];

        return Inertia::render('status-report', [
            'statusData'      => $statusData,
            'monthlyFlow'     => $monthlyFlow,
            'selectedMonth'   => $selectedMonth,
            'availableMonths' => $availableMonths,
            'totals'          => $totals,
            'filteredTotal'   => $filteredTotal,
        ]);
    }
}
