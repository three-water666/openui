import { systemPrompt, systemPrompt_zh } from 'api/openai'
import { atom } from 'jotai'
// atomWithStorage 储存在Storage中
import { atomWithStorage } from 'jotai/utils'

const defaultTemp = 0.3

// 系统提示词
export const systemPromptAtom = atomWithStorage('systemPrompt', systemPrompt_zh)
// 大模型温度
export const temperatureAtom = atomWithStorage('temperature', defaultTemp)
// 当前模型
export const modelAtom = atomWithStorage('model', 'gpt-3.5-turbo')
// 模型是否支持图片
export const modelSupportsImagesAtom = atom<boolean>(false)
// 模型是否支持图片列表
export const modelSupportsImagesOverridesAtom = atomWithStorage<
	Record<string, boolean | undefined>
>('modelSupportsImagesOverrides', {})
