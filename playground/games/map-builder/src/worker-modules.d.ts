declare module "*?worker" {
  const WorkerConstructor: { new (): Worker };
  export default WorkerConstructor;
}
