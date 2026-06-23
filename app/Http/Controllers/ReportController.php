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

        // Year totals for summary stats
        $totals = [
            'total'    => (clone $yearBase)->count(),
            'meetings' => (clone $yearBase)->where('status', 'Meeting')->count(),
            'deposits' => (clone $yearBase)->whereIn('status', ['1st Deposit', '2nd Deposit'])->count(),
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

        // Monthly status flow — always all time, grouped by year-month
        $flowRaw = (clone $roleBase)->selectRaw('YEAR(date) as yr, MONTH(date) as mo, status, COUNT(*) as count')
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
