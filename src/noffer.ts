import { Buffer } from 'buffer';
import { Event, generateSecretKey, SimplePool, nip69, nip19, getPublicKey, finalizeEvent, nip44, UnsignedEvent } from 'nostr-tools'
import { SubCloser } from 'nostr-tools/lib/types/abstract-pool'

(window as any).encodeNoffer = nip19.nofferEncode

export const decodeInput = async (input: string) => {
    if (input.startsWith("lightning:")) {
        input = input.slice("lightning:".length)
    }
    let offer: nip19.OfferPointer
    if (input.startsWith("noffer")) {
        const decoded = nip19.decode(input)
        if (!decoded || decoded.type !== "noffer") throw new Error("Invalid input")
        offer = decoded.data
    } else if (input.includes("@")) {
        const lnParts = input.split("@")
        const payLink = "https://" + lnParts[1] + "/.well-known/lnurlp/" + lnParts[0];
        const res = await fetch(payLink)
        const json = await res.json()
        if (json.status === "ERROR") {
            throw new Error(json.reason)
        }
        if (!json.clink_offer) {
            throw new Error("missing clink_offer from lnurl address")
        }
        const decoded = nip19.decode(json.clink_offer as string)
        if (!decoded || decoded.type !== "noffer") throw new Error("Invalid input")
        offer = decoded.data
    } else {
        throw new Error("Invalid input")
    }
    return { offer, send: wrapSend(offer) }
}
(window as any).decodeInput = decodeInput
const pool = new SimplePool()
let privateKey: Uint8Array
const secret = localStorage.getItem("nostr_secret")
if (secret) {
    privateKey = Uint8Array.from(Buffer.from(secret, "hex"))
} else {
    privateKey = generateSecretKey()
    localStorage.setItem("nostr_secret", Buffer.from(privateKey).toString("hex"))
}
const getZap = (to: string, relay: string, amt?: number) => {
    const zap: UnsignedEvent = {
        created_at: Math.floor(Date.now() / 1000),
        kind: 9734,
        tags: [
            ["p", to],
            ["relays", relay]
        ],
        content: "",
        pubkey: getPublicKey(privateKey)
    }
    if (amt) zap.tags.push(["amount", amt.toString()])
    const j = finalizeEvent(zap, privateKey)
    console.log(j)
    return JSON.stringify(j)
}
export type SendData = { amt?: number, payerData?: Record<string, string> }
const wrapSend = (offer: nip19.OfferPointer) => (data: SendData = {}) => nip69.SendNofferRequest(pool, privateKey, [offer.relay], offer.pubkey, { offer: offer.offer, amount: data.amt, zap: getZap(offer.pubkey, offer.relay, data.amt), payer_data: data.payerData })
