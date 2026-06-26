import { clientImageUrl, localImageUrl } from '../utils/assets';
import { useState } from 'react';

export function IndexedImage({ className, clientRootPath, name, kind, alt }: { className?: string; clientRootPath: string; name: string; kind: "monster" | "skin"; alt: string }) {
  const [failedClientSrc, setFailedClientSrc] = useState("");
  const clientSrc = clientRootPath.trim() ? clientImageUrl(clientRootPath, name, kind) : "";
  const src = clientSrc && failedClientSrc !== clientSrc ? clientSrc : localImageUrl(name, kind);
  return (
    <img
      className={className}
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => {
        if (src === clientSrc) setFailedClientSrc(clientSrc);
      }}
    />
  );
}
