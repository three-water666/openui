import { OpenAI } from 'openai'

function host() {
	const { hostname, protocol } = window.location
	const port = window.location.port ? `:${window.location.port}` : ''
	return `${protocol}//${hostname}${port}`
}
/* I patched OpenAI here so that users can use basic auth behind a proxy if they want */
class MyOpenAI extends OpenAI {
	// eslint-disable-next-line class-methods-use-this, @typescript-eslint/class-methods-use-this, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
	protected override authHeaders(_opts: any) {
		return {}
	}
}
const openai = new MyOpenAI({
	apiKey: 'sk-fake',
	baseURL: `${host()}/v1`,
	dangerouslyAllowBrowser: true
})

export type Action = 'create' | 'refine'
interface CreateOptions {
	model: string
	systemPrompt: string
	query: string
	temperature: number
	html?: string
	image?: string
	action: Action
}

export const systemPrompt = `🎉 Greetings, TailwindCSS Virtuoso! 🌟

You've mastered the art of frontend design and TailwindCSS! Your mission is to transform detailed descriptions or compelling images into stunning HTML using the versatility of TailwindCSS. Ensure your creations are seamless in both dark and light modes! Your designs should be responsive and adaptable across all devices – be it desktop, tablet, or mobile.

*Design Guidelines:*
- Utilize placehold.co for placeholder images and descriptive alt text.
- For interactive elements, leverage modern ES6 JavaScript and native browser APIs for enhanced functionality.
- Inspired by shadcn, we provide the following colors which handle both light and dark mode:

\`\`\`css
  --background
  --foreground
  --primary
	--border
  --input
  --ring
  --primary-foreground
  --secondary
  --secondary-foreground
  --accent
  --accent-foreground
  --destructive
  --destructive-foreground
  --muted
  --muted-foreground
  --card
  --card-foreground
  --popover
  --popover-foreground
\`\`\`

Prefer using these colors when appropriate, for example:

\`\`\`html
<button class="bg-secondary text-secondary-foreground hover:bg-secondary/80">Click me</button>
<span class="text-muted-foreground">This is muted text</span>
\`\`\`

*Implementation Rules:*
- Only implement elements within the \`<body>\` tag, don't bother with \`<html>\` or \`<head>\` tags.
- Avoid using SVGs directly. Instead, use the \`<img>\` tag with a descriptive title as the alt attribute and add .svg to the placehold.co url, for example:

\`\`\`html
<img aria-hidden="true" alt="magic-wand" src="/icons/24x24.svg?text=🪄" />
\`\`\`
`

export const systemPrompt_zh = `🎉 你好，TailwindCSS 大师！🌟

你已经掌握了前端设计和 TailwindCSS 的艺术！你的任务是将详细的描述或引人注目的图片转换为使用 TailwindCSS 的精美 HTML。确保你的作品在黑暗模式和光明模式下都能无缝切换！你的设计应在所有设备上响应良好并适应——无论是桌面、平板电脑还是移动设备。

设计指南：

使用 placehold.co 作为占位符图像和描述性替代文本。
对于交互元素，利用现代 ES6 JavaScript 和本机浏览器 API 来增强功能。
受到 shadcn 的启发，我们提供以下颜色，能够处理光明和黑暗模式：
\`\`\`css
--background
--foreground
--primary
--border
--input
--ring
--primary-foreground
--secondary
--secondary-foreground
--accent
--accent-foreground
--destructive
--destructive-foreground
--muted
--muted-foreground
--card
--card-foreground
--popover
--popover-foreground
\`\`\`

在适当的情况下，优先使用这些颜色，例如：

\`\`\`html
<button class=\"bg-secondary text-secondary-foreground hover:bg-secondary/80\">点击我</button>
<span class="text-muted-foreground">这是静音文本</span>
\`\`\`

实现规则：

只实现 \`<body>\` 标签内的元素，不需要处理 \`<html>\` 或 \`<head>\` 标签。
避免直接使用 SVG。相反，使用带有描述性标题作为 alt 属性的 \`<img>\` 标签，并在 placehold.co URL 中添加 .svg，例如：
\`\`\`html
<img aria-hidden="true" alt="magic-wand" src="/icons/24x24.svg?text=🪄" />
\`\`\`
`

const GPT4_MAX_TOKENS = 4096

/**
 * 创建或者优化 向大模型输入prompt返回大模型的结果
 * @param options
 * @param callback
 * @returns
 */
export async function createOrRefine(
	options: CreateOptions,
	callback: (response: string) => void
) {
	let { model, systemPrompt: sp } = options
	const { temperature, query, html, image, action } = options
	// Add instructions for frontmatter unless we're iterating on existing html
	// Some models don't support this being in a separate system message so we append
	if (!html) {
		// 		sp += `\n\nAlways start your response with frontmatter wrapped in ---.  Set name: with a 2 to 5 word description of the component. Set emoji: with an emoji for the component, i.e.:
		// ---
		// name: Fancy Button
		// emoji: 🎉
		// ---

		// <button class="bg-blue-500 text-white p-2 rounded-lg">Click me</button>\n\n`
		sp += `\n\n始终以前言开始你的响应，并用 --- 包裹。设置 name: 为组件的 2 到 5 个字的描述。设置 emoji: 为组件的表情符号，例如：
---
name: 精致按钮
emoji: 🎉
---

<button class="bg-blue-500 text-white p-2 rounded-lg">点击我</button>\n\n`
	}
	const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
		{
			role: 'system',
			content: sp
		}
	]

	let imageUrl = image ?? ''
	// OpenAI wants a data url, ollama just wants base64 bytes
	// TODO: this can be removed once Ollama OpenAI compat is fixed
	if (image && model.startsWith('ollama/')) {
		const parts = image.toString().split(',')
		imageUrl = parts.pop() ?? ''
	}

	if (action === 'create') {
		// Call the vision models only for creating action
		if (image) {
			// TODO: configurable
			if (model.startsWith('gpt')) {
				model = 'gpt-4o'
			}
			const textImageRequirements = query
				? `The following are some special requirements: \n ${query}`
				: ''
			messages.push({
				role: 'user',
				content: [
					{
						type: 'text',
						text: `This is a screenshot of a web component I want to replicate.  Please generate HTML for it.\n ${textImageRequirements}`
					},
					{
						type: 'image_url',
						image_url: {
							url: imageUrl
						}
					}
				]
			})
		} else {
			messages.push({
				role: 'user',
				content: query
			})
		}
	} else {
		// Annotation comments should like <!--FIX (1): make the image larger-->
		const hasAnnotationComments = /<!--FIX (\(\d+\)): (.+)-->/g.test(
			html as string
		)
		let userPrompt = hasAnnotationComments ? 'Address the FIX comments.' : query
		if (userPrompt === '') {
			userPrompt = 'Lets make this look more professional'
		}

		const instructions = `Given the following HTML${image ? ' and image' : ''}:\n\n${html}\n\n${userPrompt}`
		console.log('Sending instructions:', instructions)
		if (image) {
			// TODO: configurable
			if (model.startsWith('gpt')) {
				model = 'gpt-4o'
			}
			messages.push({
				role: 'user',
				content: [
					{
						type: 'text',
						text: instructions
					},
					{
						type: 'image_url',
						image_url: {
							url: imageUrl
						}
					}
				]
			})
		} else {
			messages.push({
				role: 'user',
				content: instructions
			})
		}
	}

	console.log('************llm-messages\n', messages)
	const response = await openai.chat.completions.create({
		model, // can change to "gpt-4" if you fancy
		messages,
		temperature,
		stream: true,
		max_tokens: GPT4_MAX_TOKENS
	})
	let markdown = ''
	for await (const chunk of response) {
		const part = chunk.choices[0]?.delta?.content ?? ''
		markdown += part
		callback(part)
	}
	console.log('************llm-markdown\n', markdown)
	return markdown
}

interface ConvertOptions {
	model: string
	temperature: number
	framework: string
	html: string
}

const systemPromptConvert = `You're a frontend web developer that specializes in $FRAMEWORK.
Given html and javascript, generate a $FRAMEWORK component. Factor the code into smaller
components if necessary. Keep all code in one file. Use hooks and put tailwind class strings
that are repeated atleast 3 times into a shared constant. Leave comments when necessary.`

export async function convert(
	options: ConvertOptions,
	callback: (response: string) => void
) {
	const { framework, model, temperature, html } = options

	const systemPromptCompiled = systemPromptConvert.replaceAll(
		'$FRAMEWORK',
		framework
	)
	const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
		{
			role: 'system',
			content: systemPromptCompiled
		}
	]
	/*
  let inputTok = ''
  const encoder = encoding_for_model('gpt-3.5-turbo')
  inputTok += systemPromptCompiled + '\n'
  */
	const userPrompt = `Please turn this into a ${framework} component.`
	const instructions = `Given the following HTML:\n\n${html}\n\n${userPrompt}`
	// inputTok += instructions + '\n'
	messages.push({
		role: 'user',
		content: instructions
	})
	/*
  const tokens = encoder.encode(inputTok)
  encoder.free()
  // TODO: use a bigger model if we're length limited
  */
	const response = await openai.chat.completions.create({
		model,
		messages,
		temperature,
		stream: true
	})
	for await (const chunk of response) {
		callback(chunk.choices[0]?.delta?.content ?? '')
	}
}
