import AppLogoIcon from '@/components/app-logo-icon';

export default function AppLogo() {
    return (
        <div className="flex flex-col">
            <div className="mb-2.5 flex h-10 w-10 items-center justify-center rounded-lg bg-[#1a3a5c]">
                <AppLogoIcon className="size-6" />
            </div>
            <span className="font-serif text-[17px] font-normal leading-tight text-white">
                Practical Homes
            </span>
            <span className="mt-0.5 text-[11px] text-white/40">
                Sales CRM · 2026
            </span>
        </div>
    );
}
