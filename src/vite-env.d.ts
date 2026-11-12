/// <reference types="vite/client" />
import React from 'react';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      marquee: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
        scrollamount?: number | string;
        direction?: "left" | "right" | "up" | "down";
        behavior?: "scroll" | "slide" | "alternate";
      }, HTMLElement>;
    }
  }
  namespace React {
    namespace JSX {
      interface IntrinsicElements {
        marquee: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
          scrollamount?: number | string;
          direction?: "left" | "right" | "up" | "down";
          behavior?: "scroll" | "slide" | "alternate";
        }, HTMLElement>;
      }
    }
  }
}

declare module "*.png" {
  const value: string;
  export default value;
}

declare module "*.jpg" {
  const value: string;
  export default value;
}

declare module "*.jpeg" {
  const value: string;
  export default value;
}

declare module "*.svg" {
  const value: string;
  export default value;
}
