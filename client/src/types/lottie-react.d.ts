declare module "lottie-react" {
  import * as React from "react";
  interface LottieProps {
    animationData: any;
    loop?: boolean | number;
    autoplay?: boolean;
    style?: React.CSSProperties;
    className?: string;
  }
  const Lottie: React.ComponentType<LottieProps>;
  export default Lottie;
}
