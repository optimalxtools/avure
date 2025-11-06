declare module "react-markdown" {
  import type { ComponentPropsWithoutRef } from "react"

  type ReactMarkdownProps = {
    children: string
    remarkPlugins?: unknown[]
    components?: Record<string, React.ComponentType<any>>
  }

  const ReactMarkdown: React.FC<ReactMarkdownProps>
  export default ReactMarkdown
}

declare module "remark-gfm" {
  const plugin: any
  export default plugin
}
