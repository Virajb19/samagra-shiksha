'use client';

export default function Loading() {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-6">
                {/* Infinity Spinner */}
                <div className="relative">
                    <img
                        src="/Spinner@1x-1.0s-200px-200px.svg"
                        alt="Loading..."
                        width={140}
                        height={140}
                        className="drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]"
                    />
                </div>
                
                {/* Pulsing Loading Text */}
                <p className="text-blue-500 dark:text-blue-400 text-lg font-medium animate-pulse">
                    Loading page...
                </p>
            </div>
        </div>
    );
}