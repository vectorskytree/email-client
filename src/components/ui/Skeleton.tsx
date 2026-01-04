interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-[#e8eaed] rounded ${className}`}
    />
  );
}

export function ContactSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <Skeleton className="h-4 w-32 mb-2" />
        <Skeleton className="h-3 w-48" />
      </div>
      <Skeleton className="h-3 w-12" />
    </div>
  );
}

export function ContactListSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div>
      {Array.from({ length: count }).map((_, i) => (
        <ContactSkeleton key={i} />
      ))}
    </div>
  );
}

export function MessageSkeleton({ isSent = false }: { isSent?: boolean }) {
  return (
    <div className={`flex ${isSent ? 'justify-end' : 'justify-start'} mb-3`}>
      <div className={`max-w-[75%] rounded-2xl px-4 py-3 shadow-sm ${isSent ? 'bg-[#d3e3fd] rounded-br-sm' : 'bg-[#f1f3f4] rounded-bl-sm'}`}>
        <Skeleton className="h-4 w-24 mb-2" />
        <Skeleton className="h-3 w-48 mb-1" />
        <Skeleton className="h-3 w-32" />
      </div>
    </div>
  );
}

export function MessageListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="p-4">
      {Array.from({ length: count }).map((_, i) => (
        <MessageSkeleton key={i} isSent={i % 3 === 0} />
      ))}
    </div>
  );
}
