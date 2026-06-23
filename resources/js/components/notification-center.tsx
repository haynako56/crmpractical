import { useEffect, useRef, useState } from 'react';
import { usePage } from '@inertiajs/react';
import { BellRing, Clock, X } from 'lucide-react';

interface AlertNotification {
    id: number;
    level: 'urgent' | 'warning';
    rep: string;
    name: string;
    type: string;
    loc: string;
    elapsed: string;
}

interface NotifCard extends AlertNotification {
    uid: string;
}

const SESSION_KEY = 'phcrm_shown_notifs';

function getShown(): Set<string> {
    try {
        const stored = sessionStorage.getItem(SESSION_KEY);
        return new Set(stored ? JSON.parse(stored) : []);
    } catch {
        return new Set();
    }
}

function markShown(uid: string) {
    const shown = getShown();
    shown.add(uid);
    try {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify([...shown]));
    } catch {}
}

export function NotificationCenter() {
    const { alertNotifications } = usePage<{ alertNotifications: AlertNotification[] }>().props;
    const [cards, setCards] = useState<NotifCard[]>([]);
    const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

    useEffect(() => {
        const shown = getShown();
        const unseen = (alertNotifications ?? []).filter(
            (notif) => !shown.has(`${notif.level}-${notif.id}`),
        );

        if (unseen.length === 0) return;

        unseen.forEach((notif, index) => {
            const uid = `${notif.level}-${notif.id}`;
            const showTimer = setTimeout(() => {
                markShown(uid);
                setCards((prev) => [...prev, { ...notif, uid }]);

                const dismissTimer = setTimeout(() => dismiss(uid), 8000);
                timers.current.set(uid, dismissTimer);
            }, index * 500);

            timers.current.set(`show-${uid}`, showTimer);
        });

        return () => {
            timers.current.forEach((timer) => clearTimeout(timer));
        };
    }, []);

    function dismiss(uid: string) {
        setCards((prev) => prev.filter((card) => card.uid !== uid));
        const timer = timers.current.get(uid);
        if (timer) {
            clearTimeout(timer);
            timers.current.delete(uid);
        }
    }

    if (cards.length === 0) return null;

    return (
        <div className="pointer-events-none fixed right-4 top-4 z-[400] flex max-w-[340px] flex-col gap-2">
            {cards.map((card) => {
                const isUrgent = card.level === 'urgent';
                const locationParts = [card.type, card.loc].filter(Boolean).join(', ');
                return (
                    <div
                        key={card.uid}
                        className={`animate-in slide-in-from-right-4 fade-in pointer-events-auto flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-lg duration-200 ${
                            isUrgent ? 'border-l-[4px] border-l-red-500' : 'border-l-[4px] border-l-orange-500'
                        }`}
                    >
                        <div
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                                isUrgent ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'
                            }`}
                        >
                            {isUrgent ? <BellRing size={15} /> : <Clock size={15} />}
                        </div>

                        <div className="min-w-0 flex-1">
                            <div className={`text-sm font-semibold ${isUrgent ? 'text-red-700' : 'text-orange-700'}`}>
                                {isUrgent ? 'Overdue lead — 24h+ no response' : 'Lead needs follow-up — 4h+ no response'}
                            </div>
                            <div className="mt-0.5 text-xs leading-snug text-gray-500">
                                {card.rep && <span className="font-medium text-gray-600">{card.rep} — </span>}
                                {card.name}
                                {locationParts && <span className="text-gray-400"> ({locationParts})</span>}
                            </div>
                            <div className={`mt-1 text-[11px] font-semibold ${isUrgent ? 'text-red-600' : 'text-orange-600'}`}>
                                {card.elapsed}
                            </div>
                        </div>

                        <button
                            onClick={() => dismiss(card.uid)}
                            className="mt-0.5 shrink-0 text-gray-400 hover:text-gray-600"
                        >
                            <X size={15} />
                        </button>
                    </div>
                );
            })}
        </div>
    );
}
