import React from "react";
import LazyImage, { LazyImageProps } from "./LazyImage";

export type OptimizedImageProps = LazyImageProps;

export function OptimizedImage(props: OptimizedImageProps) {
  return <LazyImage {...props} />;
}

export default OptimizedImage;
export { LazyImage };


