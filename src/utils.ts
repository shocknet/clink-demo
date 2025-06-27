import { generateSecretKey } from 'nostr-tools/pure';

/**
 * Manages the client's private key.
 * The key is persisted in localStorage to allow for testing features
 * that require a consistent identity, like debit budgets.
 */
function initializePrivateKey(): Uint8Array {
    const storedKey = localStorage.getItem('clink-demo-privateKey');
    if (storedKey) {
        // Retrieve the key from storage
        return new Uint8Array(storedKey.split(',').map(Number));
    } else {
        // Generate a new key and save it to storage
        const newKey = generateSecretKey();
        localStorage.setItem('clink-demo-privateKey', newKey.toString());
        return newKey;
    }
}

/**
 * The client's private key for this session.
 * Initialized once and exported for use across the demo.
 */
export const clientPrivateKey = initializePrivateKey(); 