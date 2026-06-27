export {}

declare global {
  interface Window {
    __clipWrites?: string[][]
    __clipText?: string[]
  }
}