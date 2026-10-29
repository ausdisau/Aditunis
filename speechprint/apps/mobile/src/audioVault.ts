import {AESEncryptionKey,AESSealedData,aesEncryptAsync,aesDecryptAsync} from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import {Directory,File,Paths} from "expo-file-system";
const KEY="speechprint.audio.key.v1";
const vault=()=>new Directory(Paths.document,"speechprint-vault");
async function audioKey():Promise<AESEncryptionKey>{
 const existing=await SecureStore.getItemAsync(KEY);
 if(existing)return AESEncryptionKey.import(existing,"hex");
 const key=await AESEncryptionKey.generate(256);
 await SecureStore.setItemAsync(KEY,await key.encoded("hex"));
 return key;
}
export async function encryptAndRetain(tempUri:string,id:string):Promise<string>{
 const input=new File(tempUri);
 if(!input.exists||input.size===0)throw Error("Recording empty");
 const dir=vault();if(!dir.exists)dir.create({idempotent:true,intermediates:true});
 const dest=new File(dir,id+".spenc");
 if(dest.exists)throw Error("Recording already exists");
 const bytes=await input.bytes();
 try{
   const sealed=await aesEncryptAsync(bytes,await audioKey());
   await dest.write(await sealed.combined("bytes"));
   const test=await aesDecryptAsync(AESSealedData.fromCombined(await dest.bytes()),await audioKey(),{output:"bytes"}) as Uint8Array;
   if(test.length!==bytes.length)throw Error("Vault verification failed");
   test.fill(0);input.delete();return dest.uri;
 }catch(e){if(dest.exists)dest.delete();throw e;}
 finally{bytes.fill(0);}
}
export function removeAudio(uri:string):void{
 if(!uri.startsWith(vault().uri+"/")||!uri.endsWith(".spenc"))throw Error("Unsafe vault path");
 const file=new File(uri);if(file.exists)file.delete();
}
export function discardTemp(uri:string):void{const file=new File(uri);if(file.exists)file.delete();}
