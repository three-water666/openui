import { atom } from 'jotai'
import type { HTMLAndJS } from 'lib/html'

/**
 * 当前UI状态
 */
export interface CurrentUIState {
	// This is the prompt that the user typed in the prompt bar
	// 此时输入框的输入
	prompt: string
	// This should be the HTML we get from parsing our markdown
	// 大模型解析的HTMl
	pureHTML: string
	// This get's set when a user annotated existing HTML
	// 带注释的HTML
	annotatedHTML: string
	// This get's set when a user edits the HTML
	// 被编辑的HTML
	editedHTML: string
	// Tells us if we're currently streaming changes in from an LLM
	// 是否正在rendering
	rendering: boolean
	// If we have an error, we'll show it here
	// 错误
	error?: string
	// This is what get's sent to the iframe for rendering, will have unsplash images
	// 已经被渲染的HTML
	renderedHTML?: HTMLAndJS
}
export const cleanUiState = {
	prompt: '',
	pureHTML: '',
	annotatedHTML: '',
	editedHTML: '',
	rendering: false,
	error: undefined,
	renderedHTML: undefined
}
export const uiStateAtom = atom<CurrentUIState>(cleanUiState)

export class UIState {
	public state: CurrentUIState

	public constructor(state: CurrentUIState) {
		this.state = state
	}
}
