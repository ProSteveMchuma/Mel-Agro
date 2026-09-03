import { app } from "./firebase";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

// Initialized lazily here (not in the global firebase client) so the Storage
// SDK is only bundled where it's actually used — admin image uploads.
const storage = getStorage(app);

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
