import { decodeBech32, SendNofferRequest, OfferPointer, SimplePool } from "@shocknet/clink-sdk";
import QRCode from 'qrcode';
import './styles.css';
import { clientPrivateKey } from "./utils";

// DOM Elements
const nofferInput = document.getElementById('nofferInput') as HTMLTextAreaElement;
const decodeOfferButton = document.getElementById('decodeOfferButton') as HTMLButtonElement;
const offerActions = document.getElementById('offer-actions') as HTMLDivElement;
const amountInput = document.getElementById('amountInput') as HTMLInputElement;
const getInvoiceButton = document.getElementById('getInvoiceButton') as HTMLButtonElement;
const resultsSection = document.getElementById('offer-result-section') as HTMLDivElement;
const resultHeader = document.getElementById('result-header') as HTMLHeadingElement;
const resultData = document.getElementById('result-data') as HTMLPreElement;
const qrPlaceholder = document.getElementById('qr-placeholder') as HTMLSpanElement;
const qrCanvas = document.getElementById('qrCanvas') as HTMLCanvasElement;

// Address Checker DOM Elements
const lnAddressInput = document.getElementById('lnAddressInput') as HTMLInputElement;
const checkAddressButton = document.getElementById('checkAddressButton') as HTMLButtonElement;
const addressResultSection = document.getElementById('address-result-section') as HTMLDivElement;
const addressResultHeader = document.getElementById('address-result-header') as HTMLHeadingElement;
const addressResultData = document.getElementById('address-result-data') as HTMLPreElement;

const DEFAULT_NOFFER = 'noffer1qvqsyqjqvdjkzvfevgckxvryx5er2vp5v3jngde3xscxxcmpx4jnzdnxxqcn2de3x93rxvfe8qervcmz8yer2ep5vyek2wp5v43xxwpjxymrsvcprfmhxue69uhhxarjvee8jtnndphkx6ewdejhgam0wf4sqg8rqmz9ac98cae9grcaez9spaua95u3p075q3lfzpvynxx7nj0zhctqp26c';

// State
const pool = new SimplePool();
let decodedOffer: OfferPointer | null = null;
let isInvoiceDisplayed = false;

function resetUI() {
    resultsSection.style.display = 'none';
    decodeOfferButton.style.display = 'block';
    offerActions.style.display = 'none';
    qrCanvas.style.display = 'none';
    qrPlaceholder.style.display = 'block';
    decodedOffer = null;
    isInvoiceDisplayed = false;
    decodeOfferButton.textContent = 'Decode Offer';
    nofferInput.disabled = false;
}

function showQr(show: boolean) {
    qrPlaceholder.style.display = show ? 'none' : 'inline';
    qrCanvas.style.display = show ? 'block' : 'none';
}

function scrollIntoView() {
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function scrollIntoViewElement(el: HTMLElement) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// Event Handlers
const decodeOffer = () => {
    const nofferStr = nofferInput.value.trim();
    if (!nofferStr) {
        alert("Please provide an offer string.");
        return;
    }

    resultsSection.style.display = 'block';
    qrPlaceholder.style.display = 'none';
    qrCanvas.style.display = 'none';

    try {
        const decoded = decodeBech32(nofferStr);
        if (decoded.type !== 'noffer') throw new Error("Invalid string: Expected an 'noffer'.");
        
        decodedOffer = decoded.data;
        resultHeader.textContent = 'Decoded Offer';
        resultData.textContent = JSON.stringify(decodedOffer, null, 2);
        
        decodeOfferButton.style.display = 'none';
        offerActions.style.display = 'block';
    } catch (error) {
        console.error("Error decoding offer:", error);
        resultHeader.textContent = 'Error';
        resultData.textContent = `${error instanceof Error ? error.message : String(error)}`;
        decodeOfferButton.style.display = 'block';
        offerActions.style.display = 'none';
        qrPlaceholder.style.display = 'block';
    }
    setTimeout(scrollIntoView, 100);
};

const handleGetInvoice = async () => {
    if (!decodedOffer) {
        alert("Offer data is missing. Please decode a new offer first.");
        return;
    }

    nofferInput.disabled = true;
    offerActions.style.display = 'none';
    resultHeader.textContent = 'Invoice';
    resultData.textContent = 'Requesting invoice...';

    try {
        const amountSats = amountInput.value ? parseInt(amountInput.value, 10) : undefined;
        const amountMsats = amountSats ? amountSats * 1000 : undefined;

        // Use the CLINK SDK to send a request for an invoice from the offer provider.
        // This request is sent over Nostr and signed with our ephemeral client key.
        const response = await SendNofferRequest(
            pool, clientPrivateKey, [decodedOffer.relay], decodedOffer.pubkey,
            { offer: decodedOffer.offer, amount: amountMsats }
        );

        if ('bolt11' in response && typeof response.bolt11 === 'string') {
            resultData.textContent = response.bolt11;
            qrCanvas.style.display = 'block';
            QRCode.toCanvas(qrCanvas, response.bolt11.toUpperCase(), { width: 256, margin: 1 });
        } else {
            resultHeader.textContent = 'Error Response';
            resultData.textContent = JSON.stringify(response, null, 2);
        }
    } catch (error) {
        console.error("Error getting invoice:", error);
        resultHeader.textContent = 'Error';
        resultData.textContent = `Error: ${error instanceof Error ? error.message : String(error)}`;
    } finally {
        isInvoiceDisplayed = true;
        decodeOfferButton.textContent = 'Reset';
        decodeOfferButton.style.display = 'block';
        scrollIntoView();
    }
};

const handleDecodeOrReset = () => {
    if (isInvoiceDisplayed) {
        nofferInput.value = '';
        nofferInput.placeholder = DEFAULT_NOFFER;
        resetUI();
    } else {
        let nofferStr = nofferInput.value.trim();
        if (!nofferStr && nofferInput.placeholder) {
            nofferStr = nofferInput.placeholder.trim();
            nofferInput.value = nofferStr;
        }
        decodeOffer();
    }
};

async function checkLightningAddress() {
    let addr = lnAddressInput.value.trim();
    if (!addr && lnAddressInput.placeholder) {
        addr = lnAddressInput.placeholder.trim();
        lnAddressInput.value = addr; // populate field so user sees used value
    }
    if (!addr || !addr.includes('@')) {
        alert('Please enter a valid Lightning address (e.g., alice@example.com)');
        return;
    }

    const [name, domain] = addr.split('@');
    const url = `https://${domain}/.well-known/nostr.json?name=${encodeURIComponent(name)}`;

    addressResultHeader.textContent = 'Checking…';
    addressResultData.textContent = `GET ${url}`;
    addressResultSection.style.display = 'block';

    try {
        const resp = await fetch(url, { headers: { 'Accept': 'application/json' } });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();

        const pubkey = data.names?.[name] ?? null;
        let offer: string | null = null;
        if (typeof data.clink_offer === 'string') {
            offer = data.clink_offer;
        } else if (data.clink_offer && typeof data.clink_offer === 'object') {
            offer = data.clink_offer[name] ?? null;
        }

        if (offer) {
            addressResultHeader.textContent = 'CLINK Enabled 🎉';
        } else {
            addressResultHeader.textContent = 'No CLINK Offer Found';
        }

        addressResultData.textContent = JSON.stringify(data, null, 2);
    } catch (error) {
        console.error('Address check failed:', error);
        addressResultHeader.textContent = 'Error';
        addressResultData.textContent = `${error instanceof Error ? error.message : String(error)}`;
    }

    setTimeout(() => scrollIntoViewElement(addressResultSection), 100);
}

// Event Listeners
decodeOfferButton.addEventListener('click', handleDecodeOrReset);
getInvoiceButton.addEventListener('click', handleGetInvoice);

nofferInput.addEventListener('input', resetUI);

// Address Checker Event Listeners
checkAddressButton.addEventListener('click', checkLightningAddress);

// Initial State
nofferInput.value = DEFAULT_NOFFER;
nofferInput.placeholder = '';
resetUI();