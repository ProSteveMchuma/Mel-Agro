import { app } from "./firebase";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

// Initialized lazily here (not in the global firebase client) so the Storage
// SDK is only bundled where it's actually used — admin image uploads.
const storage = getStorage(app);

/** Shrink a catalogue photo before it is stored. The live site cannot run Next's image optimizer. */
export async function prepareCatalogueImage(file: File): Promise<File> {
    if (typeof document === 'undefined') return file;
    if (!file.type.startsWith('image/') || file.type === 'image/gif' || file.type === 'image/svg+xml') return file;
    try {
        const bitmap = await createImageBitmap(file);
        const maxEdge = 1200;
        const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
        if (scale === 1 && file.size < 250_000) {
            bitmap.close();
            return file;
        }
        const width = Math.max(1, Math.round(bitmap.width * scale));
        const height = Math.max(1, Math.round(bitmap.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d');
        if (!context) {
            bitmap.close();
            return file;
        }
        context.drawImage(bitmap, 0, 0, width, height);
        bitmap.close();
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.82));
        if (!blob) return file;
        const name = file.name.replace(/\.[^.]+$/, '') + '.jpg';
        return new File([blob], name, { type: 'image/jpeg' });
    } catch {
        return file;
    }
}

export const uploadImage = async (file: File, path: string): Promise<string> => {
    try {
        const storageRef = ref(storage, path);
        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);
        return downloadURL;
    } catch (error) {
        console.error("Error uploading image:", error);
        throw error;
    }
};
