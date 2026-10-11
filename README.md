# WhatsApp Auto-Reply Bot — PAKHTOON CHAT ROOM

Koi tumhare WhatsApp Business number par message karega to yeh bot
tumhare app ke Firebase backend se data nikaal kar **khud jawab** dega.

## Bot kya kya jawab de sakta hai (abhi)

| Message | Jawab (tumhari API/Firebase se) |
|---|---|
| `Salam` / `Hi` | Khush aamdeed + menu |
| `CODE UCABC123` | Referral code valid hai ya nahi, invite link, invited count, kamaye gaye coins |
| `OFFER` | Taza elan (`config/admin.announcement`) + referral reward |
| `DOWNLOAD` | Play Store link (`config/admin.playStoreUrl`) |
| `HELP` | Commands ka menu |
| kuch aur | Polite fallback + menu |

Naye commands `buildReply()` mein aasani se add ho sakte hain.

## Setup (ek dafa karna hai)

### 1. Meta Developer account
1. [developers.facebook.com](https://developers.facebook.com) par account banao
2. **Create App** → WhatsApp product add karo
3. **API Setup** se milenge: `WHATSAPP_PHONE_NUMBER_ID` aur test token
4. Production ke liye: apna business number add karo (business verification lag sakti hai) aur **permanent access token** banao

### 2. Server host karo (HTTPS zaroori hai)
- Render / Railway / koi VPS — free options kaafi hain shuruaat ke liye
- Is folder ko deploy karo, ya:
  ```
  npm install
  npm start
  ```

### 3. Firebase service account
- Firebase Console → Project Settings → Service Accounts → **Generate new private key**
- JSON file ko is folder mein `serviceAccountKey.json` naam se rakho
- ⚠️ Yeh file kisi ko mat bhejo — is mein full access hota hai

### 4. .env banao
```
cp .env.example .env
```
Aur andar 4 values bhardo: `VERIFY_TOKEN`, `WHATSAPP_TOKEN`,
`WHATSAPP_PHONE_NUMBER_ID`, `FIREBASE_SERVICE_ACCOUNT`.

### 5. Webhook lagao
- Meta dashboard → WhatsApp → Configuration → Webhook
- Callback URL: `https://tumhara-server.com/webhook`
- Verify token: wohi jo `.env` mein `VERIFY_TOKEN` hai
- **messages** field ko subscribe karo

### 6. Test
Apne phone se business number par `Hi` bhejo — bot ko foran jawab dena chahiye.
Server ke logs mein `Incoming from ...` nazar aayega.

## Zaroori baatein
- WhatsApp **khud** code host nahi karta — yeh server Meta ke Cloud API se baat karta hai.
- Test mode mein sirf 5 numbers tak message ja sakta hai; production ke liye business verification chahiye.
- 24 ghante ke baad user ko message bhejne ke liye template message chahiye hota hai (Meta ka rule) — bot sirf **jawab** deta hai, pehal nahi karta.
