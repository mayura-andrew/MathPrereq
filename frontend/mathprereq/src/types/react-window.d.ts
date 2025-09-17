// Minimal declarations for react-window used in this project.
// You can alternatively install the official types with:
// pnpm add -D @types/react-window

declare module 'react-window' {
  import * as React from 'react';

  export type ListChildComponentProps = {
    index: number;
    style: React.CSSProperties;
    data?: unknown;
  };

  export interface FixedSizeListProps {
    height: number | string;
    itemCount: number;
    itemSize: number | ((index: number) => number);
    width: number | string;
    children: React.ComponentType<ListChildComponentProps> | ((props: ListChildComponentProps) => React.ReactNode);
    itemData?: unknown;
  }

  export class FixedSizeList extends React.Component<FixedSizeListProps> {}

  export { FixedSizeList };
  const _default: {
    FixedSizeList: typeof FixedSizeList;
  };
  export default _default;
}