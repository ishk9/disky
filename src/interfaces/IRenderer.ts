export interface IRenderer<T> {
  render(data: T): string;
}
