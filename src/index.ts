declare let BOT_TOKEN: string
declare let WEBHOOK_SECRET: string
declare let SET_WEBHOOK_SECRET: string
declare let DELETE_WEBHOOK_SECRET: string
declare let GET_WEBHOOK_INFO_SECRET: string

const TG_API_DOMAIN = 'api.telegram.org'
const TG_REQ_URL = `https://${TG_API_DOMAIN}/bot${BOT_TOKEN}`

function getWebhookInfo() {
  const url = `${TG_REQ_URL}/getWebhookInfo`
  return fetch(url)
}

function setWebhook(webhookUrl: string) {
  const url = `${TG_REQ_URL}/setWebhook?url=${encodeURIComponent(
    webhookUrl,
  )}&allowed_updates=${encodeURIComponent(`["message", "chat_member"]`)}`
  return fetch(url)
}

function deleteWebhook() {
  const url = `${TG_REQ_URL}/deleteWebhook`
  return fetch(url)
}

function banChatMember(chatID: number, userID: number) {
  const newTime = new Date(new Date().getTime() + 1 * 60000)
  const url = `${TG_REQ_URL}/banChatMember?chat_id=${chatID}&user_id=${userID}&until_date=${Math.floor(
    newTime.getTime() / 1000,
  )}`
  return fetch(url)
}

function deleteMessage(chatID: number, messageID: number): Promise<Response> {
  const url = `${TG_REQ_URL}/deleteMessage?chat_id=${chatID}&message_id=${messageID}`
  return fetch(url)
}

// function sendMessage(chatID: number, text: string) {
//   const url = `${TG_REQ_URL}/sendMessage?chat_id=${chatID}&text=\`${text}\`&parse_mode=MarkdownV2`
//   return fetch(url)
// }

async function handleRequest(request: Request) {
  if (request.method == 'POST') {
    const data = await request.json()
    let resp: Response | undefined
    // if (
    //   data.message !== undefined &&
    //   data.message.chat.id == -1001185712879 &&
    //   data.message.text == '/test'
    // ) {
    //   resp = await sendMessage(data.message.chat.id, 'TEST')
    // }
    if (
      data.message !== undefined &&
      (data.message.new_chat_members !== undefined ||
        data.message.left_chat_member !== undefined)
    ) {
      resp = await deleteMessage(data.message.chat.id, data.message.message_id)
    } else if (data.chat_member !== undefined) {
      // const oldChatMemberStatus = data.chat_member.old_chat_member.status
      const newChatMemberStatus = data.chat_member.new_chat_member.status
      if (
        /* oldChatMemberStatus === 'left' && */ newChatMemberStatus === 'member'
      ) {
        resp = await banChatMember(
          data.chat_member.chat.id,
          data.chat_member.new_chat_member.user.id,
        )
      }
    }

    if (resp != undefined) {
      const respData = await resp.json()
      if (respData.ok) {
        return new Response('ok', { status: 200 })
      } else {
        return new Response('fail', { status: 500 })
      }
    }
  }

  return new Response('forbidden', { status: 403 })
}

addEventListener('fetch', (event) => {
  if (BOT_TOKEN == undefined || WEBHOOK_SECRET == undefined) {
    event.respondWith(new Response('ENV missing!', { status: 500 }))
    return
  }

  const realIP = event.request.headers.get('x-real-ip')
  const connectingIP = event.request.headers.get('cf-connecting-ip')

  const { url, method } = event.request
  const { pathname, host, protocol } = new URL(url)

  console.log(`[${realIP}][${connectingIP}] ${pathname}`)

  switch (pathname) {
    case GET_WEBHOOK_INFO_SECRET:
      console.log(`[${realIP}][${connectingIP}] getWebhookInfo`)
      event.respondWith(getWebhookInfo())
      return
    case SET_WEBHOOK_SECRET:
      console.log(`[${realIP}][${connectingIP}] setWebhook`)
      event.respondWith(setWebhook(protocol + '//' + host + WEBHOOK_SECRET))
      return
    case DELETE_WEBHOOK_SECRET:
      console.log(`[${realIP}][${connectingIP}] deleteWebhook`)
      event.respondWith(deleteWebhook())
      return
    default:
  }
  if (pathname == WEBHOOK_SECRET && method == 'POST') {
    event.respondWith(handleRequest(event.request))
    return
  }

  event.respondWith(
    new Response('FORBIDDEN', {
      status: 403,
    }),
  )
})
