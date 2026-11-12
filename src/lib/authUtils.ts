
export async function updateUserLoginMetadata(userOrId: any) {
  try {
    const { doc, getDoc, setDoc, serverTimestamp } = await import('firebase/firestore');
    const { db } = await import('./firebase');
    
    const userId = typeof userOrId === 'string' ? userOrId : userOrId.uid;
    const userDocRef = doc(db, 'users', userId);
    
    // Check if doc exists first to avoid create rule trigger
    const docSnap = await getDoc(userDocRef);
    if (!docSnap.exists()) {
      if (typeof userOrId === 'object' && userOrId.email) {
        const role = userOrId.email === 'khyhajmr08@gmail.com' || userOrId.uid === 'PqXqqCgdC1eYPz4HKHHLtDRejPD3' ? 'admin' : 'user';
        await setDoc(userDocRef, {
           uid: userOrId.uid,
           name: userOrId.displayName || userOrId.email?.split('@')[0] || 'User',
           email: userOrId.email,
           role: role,
           blocked: false,
           createdAt: serverTimestamp(),
           reviewStatus: 'Active'
        });
      } else {
        console.warn("User document does not exist, skipping metadata update");
        return;
      }
    }

    const userAgent = navigator.userAgent;
    let device = "Desktop";
    if (/Mobi|Android/i.test(userAgent)) device = "Mobile";
    
    // Simple browser detection
    let browser = "Unknown";
    if (userAgent.includes("Chrome")) browser = "Chrome";
    else if (userAgent.includes("Firefox")) browser = "Firefox";
    else if (userAgent.includes("Safari")) browser = "Safari";
    else if (userAgent.includes("Edge")) browser = "Edge";

    // Getting IP is usually done on backend or via external service for client-side
    let ip = "0.0.0.0";
    try {
      const res = await fetch('https://api.ipify.org?format=json');
      const data = await res.json();
      ip = data.ip;
    } catch (e) {
      console.warn("Could not fetch IP", e);
    }

    const metadataUpdate = {
      lastLogin: serverTimestamp(),
      lastIP: ip,
      lastDevice: device,
      lastBrowser: browser,
      sessionActive: true,
      updatedAt: serverTimestamp()
    };

    await setDoc(userDocRef, metadataUpdate, { merge: true });
  } catch (error) {
    console.error("Error updating login metadata:", error);
  }
}

export async function createAdminLog(adminId: string, adminName: string, targetUserId: string, targetUserName: string, action: string, details: string, reason: string, previousValue?: any, newValue?: any) {
  try {
    const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
    const { db } = await import('./firebase');
    
    await addDoc(collection(db, 'admin_logs'), {
      adminId,
      adminName,
      targetUserId,
      targetUserName: targetUserName || 'نظام',
      action,
      details,
      reason,
      previousValue: previousValue !== undefined ? previousValue : null,
      newValue: newValue !== undefined ? newValue : null,
      timestamp: serverTimestamp()
    });
  } catch (error) {
    console.error("Error creating admin log:", error);
  }
}
