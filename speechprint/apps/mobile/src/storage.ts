import * as SQLite from "expo-sqlite";
import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";
import type {ConsentEvent, LexiconRule, Purpose} from "@adtunis/speechprint-core";
import {NOTICE_VERSION} from "@adtunis/speechprint-core";
export type DB = SQLite.SQLiteDatabase;
const keyName="speechprint.db.key.v1";
export const uid=(prefix:string)=>prefix+"_"+Array.from(Crypto.getRandomBytes(16),b=>b.toString(16).padStart(2,"0")).join("");
export type Utterance={id:string;audioUri:string;prompt:string;transcript:string;verified:boolean;createdAt:string};
export async function openPrivateDb():Promise<DB>{
 let secret=await SecureStore.getItemAsync(keyName);
 if(!secret){secret=Array.from(Crypto.getRandomBytes(32),b=>b.toString(16).padStart(2,"0")).join("");await SecureStore.setItemAsync(keyName,secret);}
 const db=await SQLite.openDatabaseAsync("speechprint.db");
 // SQLCipher is required; never fall back to a plaintext database.
 await db.execAsync("PRAGMA key = \"x'"+secret+"'\";");
 const cipher=await db.getFirstAsync<{cipher_version:string}>("PRAGMA cipher_version");
 if(!cipher?.cipher_version){await db.closeAsync();throw Error("SQLCipher unavailable. Use a native Expo development build; plaintext storage disabled.");}
 await db.execAsync("CREATE TABLE IF NOT EXISTS consent (event_id TEXT PRIMARY KEY,purpose TEXT,allowed INTEGER,occurred_at TEXT,notice_version TEXT); CREATE TABLE IF NOT EXISTS utterances (id TEXT PRIMARY KEY,audio_uri TEXT,prompt TEXT,transcript TEXT,verified INTEGER,created_at TEXT); CREATE TABLE IF NOT EXISTS lexicon (id TEXT PRIMARY KEY,heard TEXT,replacement TEXT,enabled INTEGER);");
 return db;
}
export async function getConsent(db:DB):Promise<ConsentEvent[]>{
 const rows=await db.getAllAsync<{event_id:string;purpose:Purpose;allowed:number;occurred_at:string;notice_version:string}>("SELECT * FROM consent ORDER BY rowid");
 return rows.map(r=>({eventId:r.event_id,purpose:r.purpose,allowed:r.allowed===1,occurredAt:r.occurred_at,noticeVersion:r.notice_version,method:"direct_accessible_ui"}));
}
export async function setConsent(db:DB,purpose:Purpose,allowed:boolean):Promise<void>{
 await db.runAsync("INSERT INTO consent VALUES (?,?,?,?,?)",uid("evt"),purpose,allowed?1:0,new Date().toISOString(),NOTICE_VERSION);
}
export async function addUtterance(db:DB,u:Utterance):Promise<void>{
 await db.runAsync("INSERT INTO utterances VALUES (?,?,?,?,?,?)",u.id,u.audioUri,u.prompt,u.transcript,u.verified?1:0,u.createdAt);
}
export async function getUtterances(db:DB):Promise<Utterance[]>{
 const rows=await db.getAllAsync<{id:string;audio_uri:string;prompt:string;transcript:string;verified:number;created_at:string}>("SELECT * FROM utterances ORDER BY rowid DESC");
 return rows.map(r=>({id:r.id,audioUri:r.audio_uri,prompt:r.prompt,transcript:r.transcript,verified:r.verified===1,createdAt:r.created_at}));
}
export async function setTranscript(db:DB,id:string,value:string):Promise<void>{
 if(!value.trim())throw Error("Transcript cannot be empty.");
 await db.runAsync("UPDATE utterances SET transcript=?,verified=1 WHERE id=?",value.trim(),id);
}
export async function removeUtterance(db:DB,id:string):Promise<void>{await db.runAsync("DELETE FROM utterances WHERE id=?",id);}
export async function getRules(db:DB):Promise<LexiconRule[]>{
 const rows=await db.getAllAsync<{id:string;heard:string;replacement:string;enabled:number}>("SELECT * FROM lexicon ORDER BY rowid");
 return rows.map(r=>({id:r.id,heard:r.heard,replacement:r.replacement,enabled:r.enabled===1}));
}
export async function addRule(db:DB,heard:string,replacement:string):Promise<void>{
 if(!heard.trim()||!replacement.trim())throw Error("Both fields required.");
 await db.runAsync("INSERT INTO lexicon VALUES (?,?,?,1)",uid("lex"),heard.trim(),replacement.trim());
}
export async function removeRule(db:DB,id:string):Promise<void>{await db.runAsync("DELETE FROM lexicon WHERE id=?",id);}
