
export async function approveRequest(requestId: string, uid: string, amount: number) {
  try {
    const { doc, serverTimestamp, updateDoc, addDoc, collection } = await import("firebase/firestore");
    const { db } = await import("./firebase");
    
    await updateDoc(doc(db, "requests", requestId), {
      status: "approved",
      processedAt: serverTimestamp(),
    });

    await addDoc(collection(db, "transactions"), {
      uid,
      requestId,
      type: "topup",
      amount,
      status: "success",
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error approving request:", error);
    throw error;
  }
}
