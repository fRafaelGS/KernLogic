declare module 'lodash/isEqual' {
  function isEqual(value: any, other: any): boolean;
  export default isEqual;
}

declare module 'lodash/debounce' {
  function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait?: number,
    options?: {
      leading?: boolean;
      trailing?: boolean;
      maxWait?: number;
    }
  ): T & { cancel(): void; flush(): void; };
  export default debounce;
} 