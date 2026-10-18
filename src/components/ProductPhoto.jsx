"use client";

import { useMemo } from "react";
import Image from "next/image";
import { swatchDataUri } from "@/lib/fabric";

export default function ProductPhoto({ product, size = 48, rounded = "rounded-xl", className = "" }) {
  const src = useMemo(
    () => product.photo || swatchDataUri({ tone: product.tone, category: product.category, seed: product.id }),
    [product.photo, product.tone, product.category, product.id]
  );

  return (
    <Image
      unoptimized
      src={src}
      alt={product.name}
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className={`shrink-0 object-cover ${rounded} ${className}`}
    />
  );
}
