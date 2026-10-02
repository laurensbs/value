'use server'

import { sendChat, type ChatMessage } from '../chat'
import { actionViewer } from '../session'
import type { FormState } from './profile'

export async function sendChatMessage(requestId: string, body: string): Promise<FormState & { chat?: ChatMessage }> {
  return sendChat(requestId, await actionViewer(), body)
}
