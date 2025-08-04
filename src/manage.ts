import { decodeBech32, SendNmanageRequest, getPublicKey, SimplePool, nip19, ManagePointer, OfferData } from "@shocknet/clink-sdk";
import QRCode from 'qrcode';
import './styles.css';
import { clientPrivateKey } from "./utils";

// --- DOM Elements ---
const nmanageInput = document.getElementById('nmanageInput') as HTMLTextAreaElement;
const manageActionButton = document.getElementById('manageActionButton') as HTMLButtonElement;
const decodedManageData = document.getElementById('decodedManageData') as HTMLPreElement;

const manageActions = document.getElementById('manage-actions') as HTMLDivElement;
const listButton = document.getElementById('list-button') as HTMLButtonElement;
const createButton = document.getElementById('create-button') as HTMLButtonElement;
const updateButton = document.getElementById('update-button') as HTMLButtonElement;

const callbackUrlInput = document.getElementById('callback-url') as HTMLInputElement;
const labelInput = document.getElementById('label') as HTMLInputElement;
const payerDataInput = document.getElementById('payer-data') as HTMLInputElement;
const priceSatsInput = document.getElementById('price-sats') as HTMLInputElement;

const listOfferResult = document.getElementById('listOfferResult') as HTMLDivElement;

const clientIdentityDiv = document.getElementById('client-identity') as HTMLDivElement;
const clientNpubSpan = document.getElementById('client-npub') as HTMLSpanElement;

// --- State ---
const pool = new SimplePool();
let decodedManage: ManagePointer | null = null;
let isPaymentMade = false;
let updatingOfferId: string | null = null;

function displayClientIdentity() {
    const publicKey = getPublicKey(clientPrivateKey);
    const npub = nip19.npubEncode(publicKey);
    clientNpubSpan.textContent = `${npub.slice(0, 10)}...${npub.slice(-5)}`;
    clientIdentityDiv.style.display = 'block';
}

function resetUI() {
    decodedManageData.textContent = 'Decoded data will appear here...';
    manageActions.style.display = 'none';
    manageActionButton.style.display = 'block';
    manageActionButton.textContent = 'Decode Manage';
    nmanageInput.disabled = false;
    decodedManage = null;
    isPaymentMade = false;
    listOfferResult.innerHTML = '';
    updateButton.style.display = 'none';
    createButton.style.display = 'block';
    updatingOfferId = null;
}

// --- Event Handlers ---
const handleDecodeManage = () => {
    const nmanageStr = nmanageInput.value.trim();
    console.log(nmanageStr);
    if (!nmanageStr) {
        alert("Please provide a manage string.");
        return;
    }
    try {
        const decoded = decodeBech32(nmanageStr);
        if (decoded.type !== 'nmanage') throw new Error("Invalid string: Expected an 'nmanage'.");

        decodedManage = decoded.data;
        decodedManageData.textContent = JSON.stringify(decodedManage, null, 2);

        manageActions.style.display = 'block';
        nmanageInput.disabled = true;
        manageActionButton.style.display = 'none';

    } catch (error) {
        console.error("Error decoding debit:", error);
        decodedManageData.textContent = `Error: ${error instanceof Error ? error.message : String(error)}`;
    }
};

const handleDeleteOffer = async (offerId: string) => {
    console.log("Deleting offer", offerId);
    if (!decodedManage) {
        alert("Manage data is missing. Please decode a new manage string.");
        return;
    }
    const response = await SendNmanageRequest(pool, clientPrivateKey, [decodedManage.relay], decodedManage.pubkey, {
        action: 'delete',
        resource: 'offer',
        offer: { id: offerId }
    });
    console.log(response);
    handleListOffers();
}

const handleListOffers = async () => {
    console.log("Listing offers");
    if (!decodedManage) {
        alert("Manage data is missing. Please decode a new manage string.");
        return;
    }
    const response = await SendNmanageRequest(pool, clientPrivateKey, [decodedManage.relay], decodedManage.pubkey, {
        action: 'list',
        resource: 'offer',
        pointer: decodedManage.pointer
    });
    console.log(response);
    if (response.res !== 'ok') {
        alert(response.error);
        return;
    }
    if (!response.details || !Array.isArray(response.details)) {
        alert("Invalid response format");
        return;
    }
    const offers = response.details;
    listOfferResult.innerHTML = '';
    offers.forEach(offer => {
        const offerDiv = document.createElement('pre');
        const labelP = document.createElement('p');
        labelP.textContent = offer.label;
        offerDiv.appendChild(labelP);

        const priceP = document.createElement('p');
        priceP.textContent = `Price: ${offer.price_sats} sats`;
        offerDiv.appendChild(priceP);

        const callbackUrlP = document.createElement('p');
        callbackUrlP.textContent = `Callback URL: ${offer.callback_url}`;
        offerDiv.appendChild(callbackUrlP);

        const payerDataP = document.createElement('p');
        payerDataP.textContent = `Payer Data: ${offer.payer_data.join(", ")}`;
        offerDiv.appendChild(payerDataP);

        const noffersP = document.createElement('p');
        noffersP.textContent = `Noffer: ${offer.noffer}`;
        offerDiv.appendChild(noffersP);

        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        deleteButton.addEventListener('click', () => {
            handleDeleteOffer(offer.id);
        });
        offerDiv.appendChild(deleteButton);

        const updateButton = document.createElement('button');
        updateButton.textContent = 'Update';
        updateButton.addEventListener('click', () => {
            startUpdateOffer(offer);
        });
        offerDiv.appendChild(updateButton);

        listOfferResult.appendChild(offerDiv);
    })
}

const startUpdateOffer = async (offer: OfferData) => {
    callbackUrlInput.value = offer.callback_url;
    labelInput.value = offer.label;
    payerDataInput.value = offer.payer_data.join(" ");
    priceSatsInput.value = offer.price_sats.toString();
    updateButton.style.display = 'block';
    createButton.style.display = 'none';
    updatingOfferId = offer.id;
}

const handleUpdateOffer = async () => {
    console.log("Updating offer", updatingOfferId);
    if (!decodedManage) {
        alert("Manage data is missing. Please decode a new manage string.");
        return;
    }
    if (!updatingOfferId) {
        alert("Offer ID is missing. Please start an update offer.");
        return;
    }
    const callbackUrl = callbackUrlInput.value.trim();
    const label = labelInput.value.trim();
    const payerData = payerDataInput.value.trim().split(" ");
    const priceSats = +priceSatsInput.value.trim();
    if (!label) {
        alert("Label is required");
        return;
    }
    const response = await SendNmanageRequest(pool, clientPrivateKey, [decodedManage.relay], decodedManage.pubkey, {
        action: 'update',
        resource: 'offer',
        offer: {
            id: updatingOfferId,
            fields: {
                callback_url: callbackUrl,
                label: label,
                payer_data: payerData,
                price_sats: priceSats,
            }
        }
    })
    console.log(response);
    handleListOffers();
}

const handleCreateOffer = async () => {
    console.log("Creating offer");
    if (!decodedManage) {
        alert("Manage data is missing. Please decode a new manage string.");
        return;
    }
    const callbackUrl = callbackUrlInput.value.trim();
    const label = labelInput.value.trim();
    const payerData = payerDataInput.value.trim().split(" ");
    const priceSats = +priceSatsInput.value.trim();
    if (!label) {
        alert("Label is required");
        return;
    }


    const response = await SendNmanageRequest(pool, clientPrivateKey, [decodedManage.relay], decodedManage.pubkey, {
        action: 'create',
        resource: 'offer',
        pointer: decodedManage.pointer,
        offer: {
            fields: {
                callback_url: callbackUrl,
                label: label,
                payer_data: payerData,
                price_sats: priceSats,
            }
        }
    })
    console.log(response);
    handleListOffers();
}

// Event Listeners
manageActionButton.addEventListener('click', handleDecodeManage);
nmanageInput.addEventListener('input', resetUI);
listButton.addEventListener('click', handleListOffers);
createButton.addEventListener('click', handleCreateOffer);
updateButton.addEventListener('click', handleUpdateOffer);



// Initial State
resetUI();
displayClientIdentity(); 