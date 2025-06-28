import { decodeBech32, SendNdebitRequest, newNdebitPaymentRequest, DebitPointer, getPublicKey, SimplePool, nip19 } from "@shocknet/clink-sdk";
import QRCode from 'qrcode';
import './styles.css';
import { clientPrivateKey } from "./utils";

// --- DOM Elements ---
const ndebitInput = document.getElementById('ndebitInput') as HTMLTextAreaElement;
const debitActionButton = document.getElementById('debitActionButton') as HTMLButtonElement;
const decodedDebitData = document.getElementById('decodedDebitData') as HTMLPreElement;
const bolt11Input = document.getElementById('bolt11Input') as HTMLTextAreaElement;
const paymentResult = document.getElementById('payment-result') as HTMLDivElement;
const paymentData = document.getElementById('paymentData') as HTMLPreElement;
const qrContainer = document.getElementById('debit-qr-container') as HTMLDivElement;
const qrCanvas = document.getElementById('debitQrCanvas') as HTMLCanvasElement;
const decodedDataContainer = document.querySelector('.decoded-data-container') as HTMLDivElement;
const bolt11FormGroup = bolt11Input.parentElement as HTMLDivElement;
const debitActions = document.getElementById('debit-actions') as HTMLDivElement;
const clientIdentityDiv = document.getElementById('client-identity') as HTMLDivElement;
const clientNpubSpan = document.getElementById('client-npub') as HTMLSpanElement;

// --- State ---
const pool = new SimplePool();
let decodedDebit: DebitPointer | null = null;
let isPaymentMade = false;

function displayClientIdentity() {
    const publicKey = getPublicKey(clientPrivateKey);
    const npub = nip19.npubEncode(publicKey);
    clientNpubSpan.textContent = `${npub.slice(0, 10)}...${npub.slice(-5)}`;
    clientIdentityDiv.style.display = 'block';
}

function resetUI() {
    decodedDataContainer.style.display = 'block';
    decodedDebitData.textContent = 'Decoded data will appear here...';
    paymentResult.style.display = 'none';
    debitActions.style.display = 'none';
    debitActionButton.textContent = 'Decode Debit';
    ndebitInput.disabled = false;
    bolt11Input.value = '';
    qrContainer.style.display = 'none';
    decodedDebit = null;
    isPaymentMade = false;
}

// --- Event Handlers ---
const handleDecodeDebit = () => {
    const ndebitStr = ndebitInput.value.trim();
    if (!ndebitStr) {
        alert("Please provide a debit string.");
        return;
    }

    try {
        const decoded = decodeBech32(ndebitStr);
        if (decoded.type !== 'ndebit') throw new Error("Invalid string: Expected an 'ndebit'.");
        
        decodedDebit = decoded.data;
        decodedDebitData.textContent = JSON.stringify(decodedDebit, null, 2);
        
        debitActions.style.display = 'block';
        debitActionButton.textContent = 'Pay Invoice';
        ndebitInput.disabled = true;

    } catch (error) {
        console.error("Error decoding debit:", error);
        decodedDebitData.textContent = `Error: ${error instanceof Error ? error.message : String(error)}`;
    }
};

const handlePayInvoice = async () => {
    const bolt11 = bolt11Input.value.trim();
    if (!decodedDebit) {
        alert("Debit data is missing. Please decode a new debit string.");
        return;
    }
    if (!bolt11) {
        alert("Please provide a bolt11 invoice to pay.");
        return;
    }

    paymentResult.style.display = 'block';
    paymentData.textContent = 'Sending payment...';
    decodedDataContainer.style.display = 'none';

    try {
        const paymentRequest = newNdebitPaymentRequest(bolt11, undefined, decodedDebit.pointer);
        const response = await SendNdebitRequest(
            pool, clientPrivateKey, [decodedDebit.relay], decodedDebit.pubkey, paymentRequest
        );
        paymentData.textContent = JSON.stringify(response, null, 2);
    } catch (error) {
        console.error("Error sending debit request:", error);
        paymentData.textContent = `Error: ${error instanceof Error ? error.message : String(error)}`;
    } finally {
        isPaymentMade = true;
        debitActionButton.textContent = 'Reset';
    }
};

const handleDebitAction = () => {
    if (isPaymentMade) {
        ndebitInput.value = '';
        resetUI();
    } else if (decodedDebit) {
        handlePayInvoice();
    } else {
        handleDecodeDebit();
    }
};

// Event Listeners
debitActionButton.addEventListener('click', handleDebitAction);
ndebitInput.addEventListener('input', resetUI);

function handleInvoiceInput() {
    const bolt11 = bolt11Input.value.trim();
    if (bolt11) {
        qrContainer.style.display = 'block';
        QRCode.toCanvas(qrCanvas, bolt11.toUpperCase(), { width: 256, margin: 1 });
    } else {
        qrContainer.style.display = 'none';
    }
}
bolt11Input.addEventListener('input', handleInvoiceInput);

// Initial State
resetUI();
displayClientIdentity(); 