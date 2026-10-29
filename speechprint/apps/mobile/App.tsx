import React,{useEffect,useState} from "react";
import {Alert,ActivityIndicator,Pressable,ScrollView,StyleSheet,Text,TextInput,View} from "react-native";
import {useAudioRecorder,RecordingPresets,requestRecordingPermissionsAsync,setAudioModeAsync} from "expo-audio";
import * as Speech from "expo-speech";
import {createBottomTabNavigator} from "@react-navigation/bottom-tabs";
import {NavigationContainer} from "@react-navigation/native";
import {applyLexicon,evaluateGuardian,hasConsent, type ConsentEvent, type LexiconRule,type Purpose} from "@adtunis/speechprint-core";
import {openPrivateDb,getConsent,setConsent,getUtterances,addUtterance,setTranscript,removeUtterance,getRules,addRule,removeRule,uid,type DB,type Utterance} from "./src/storage";
import {encryptAndRetain,removeAudio,discardTemp} from "./src/audioVault";

const color="#173e64";
function Action({title,onPress,disabled=false}: {title:string;onPress:()=>void;disabled?:boolean}){
 return <Pressable accessibilityRole="button" accessibilityState={{disabled}} onPress={disabled?undefined:onPress} style={[styles.button,disabled&&{opacity:.45}]}><Text style={styles.buttonText}>{title}</Text></Pressable>;
}
const Tab=createBottomTabNavigator();
export default function App(){
 const [db,setDb]=useState<DB|null>(null),[failure,setFailure]=useState("");
 const [consent,setConsentState]=useState<ConsentEvent[]>([]);
 const [items,setItems]=useState<Utterance[]>([]);
 const [rules,setRules]=useState<LexiconRule[]>([]);
 const recorder=useAudioRecorder(RecordingPresets.HIGH_QUALITY);
 const [recording,setRecording]=useState(false),[busy,setBusy]=useState(false);
 const [prompt,setPrompt]=useState("Please open my messages");
 const [drafts,setDrafts]=useState<Record<string,string>>({});
 const [heard,setHeard]=useState(""),[replacement,setReplacement]=useState("");
 async function refresh(d:DB){
  setConsentState(await getConsent(d));setItems(await getUtterances(d));setRules(await getRules(d));
 }
 useEffect(()=>{let mounted=true;openPrivateDb().then(async d=>{if(!mounted){await d.closeAsync();return;}setDb(d);await refresh(d);}).catch(e=>setFailure(String(e)));return()=>{mounted=false;};},[]);
 async function change(purpose:Purpose,allowed:boolean){
  if(!db)return;
  await setConsent(db,purpose,allowed);await refresh(db);
 }
 const captureAllowed=evaluateGuardian({consentEvents:consent,purpose:"local_capture"}).decision==="ALLOW_WITH_SAFEGUARDS";
 async function start(){
  if(!db||!captureAllowed||busy)return;
  setBusy(true);
  try{
   const permission=await requestRecordingPermissionsAsync();
   if(!permission.granted){Alert.alert("Microphone access declined","You can still use typed communication.");return;}
   await setAudioModeAsync({allowsRecording:true,playsInSilentMode:true});
   await recorder.prepareToRecordAsync();recorder.record();setRecording(true);
  }catch(e){Alert.alert("Recording error",String(e));}
  finally{setBusy(false);}
 }
 async function stop(){
  if(!db||busy||!recording)return;
  setBusy(true);setRecording(false);
  const uri=recorder.uri;
  try{
   await recorder.stop();
   const temp=recorder.uri||uri;
   if(!temp)throw Error("Missing recording file");
   // Check consent AGAIN at the time the recording is retained.
   const latest=await getConsent(db);
   if(!hasConsent(latest,"local_capture")){discardTemp(temp);return;}
   const id=uid("utt");const audioUri=await encryptAndRetain(temp,id);
   try{await addUtterance(db,{id,audioUri,prompt,transcript:"",verified:false,createdAt:new Date().toISOString()});}
   catch(e){removeAudio(audioUri);throw e;}
   await refresh(db);
  }catch(e){Alert.alert("Recording not retained",String(e));}
  finally{setBusy(false);await setAudioModeAsync({allowsRecording:false});}
 }
 async function correct(id:string){
  if(!db)return;
  try{await setTranscript(db,id,drafts[id]??"");await refresh(db);}
  catch(e){Alert.alert("Correction",String(e));}
 }
 async function erase(item:Utterance){
  if(!db)return;
  Alert.alert("Delete recording?","Remove this private recording and its transcript? Hardware-level secure erasure cannot be guaranteed.",[
   {text:"Cancel",style:"cancel"},
   {text:"Delete",style:"destructive",onPress:async()=>{try{removeAudio(item.audioUri);await removeUtterance(db,item.id);await refresh(db);}catch(e){Alert.alert("Delete failed",String(e));}}}
  ]);
 }
 function Corpus(){
  return <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
    <Text style={styles.title}>Record your speech</Text>
    <Text style={styles.help}>You control recording. Audio is encrypted on your device, not uploaded. Transcripts are edited manually in this prototype.</Text>
    <Text style={styles.label}>Suggested words (optional)</Text>
    <TextInput style={styles.input} multiline value={prompt} onChangeText={setPrompt} accessibilityLabel="Optional recording prompt"/>
    <Text style={styles.help}>{recording?"Microphone recording in progress":"Microphone idle"}</Text>
    <Action title={recording?"Stop and save privately":"Start recording"} onPress={recording?stop:start} disabled={!db||busy||(!recording&&!captureAllowed)}/>
    {busy&&<ActivityIndicator/>}
    {!captureAllowed&&<Text style={styles.warning}>Enable local recording consent in the Consent tab first.</Text>}
    <Text style={styles.heading}>My recordings ({items.length})</Text>
    {items.map(item=><View style={styles.card} key={item.id}>
      <Text style={styles.help}>{new Date(item.createdAt).toLocaleString()} · Encrypted recording · {item.verified?"Transcript verified":"Needs review"}</Text>
      <Text style={styles.label}>Prompt: {item.prompt}</Text>
      <TextInput multiline style={styles.input} accessibilityLabel="Correct your transcript" defaultValue={item.transcript} onChangeText={v=>setDrafts(s=>({...s,[item.id]:v}))} placeholder="Type what you meant to say; never automatically use the prompt as ground truth."/>
      <Action title="Verify my transcript" onPress={()=>correct(item.id)}/>
      <Action title="Delete this recording" onPress={()=>erase(item)}/>
    </View>)}
  </ScrollView>;
 }
 function Personal(){
  const [text,setText]=useState("");
  const enabled=hasConsent(consent,"local_personalisation");
  const result=enabled?applyLexicon(text,rules):text;
  return <ScrollView contentContainerStyle={styles.page}>
    <Text style={styles.title}>My communication</Text>
    <Text style={styles.help}>Text and corrections work without the microphone. This version learns explicit word replacements, not a neural speech model.</Text>
    <TextInput multiline style={[styles.input,{minHeight:100}]} accessibilityLabel="Type your message" placeholder="Type a message or paste a transcript" value={text} onChangeText={setText}/>
    <Text style={styles.label}>Output</Text><Text selectable style={styles.output}>{result||"Your message appears here"}</Text>
    <Action title="Speak my message with device voice" disabled={!result.trim()} onPress={()=>Speech.speak(result,{language:"en-AU"})}/>
    <Action title="Stop speaking" onPress={()=>Speech.stop()}/>
    <Text style={styles.heading}>Personal word corrections</Text>
    <Text style={styles.help}>Create your own mappings, such as an incorrectly recognised name → the correct spelling. Active only with separate personalisation consent.</Text>
    <TextInput style={styles.input} accessibilityLabel="Text heard" placeholder="Incorrect transcription" value={heard} onChangeText={setHeard}/>
    <TextInput style={styles.input} accessibilityLabel="Preferred expression" placeholder="What I meant" value={replacement} onChangeText={setReplacement}/>
    <Action title="Save correction" disabled={!db||!enabled||!heard.trim()||!replacement.trim()} onPress={async()=>{if(!db)return;await addRule(db,heard,replacement);setHeard("");setReplacement("");await refresh(db);}}/>
    {rules.map(r=><View key={r.id} style={styles.card}><Text>{r.heard} → {r.replacement}</Text><Action title="Remove this correction" onPress={async()=>{if(!db)return;await removeRule(db,r.id);await refresh(db);}}/></View>)}
  </ScrollView>;
 }
 function Consent(){
  const notices:{purpose:Purpose;label:string;detail:string}[]=[
   {purpose:"local_capture",label:"Record on my device",detail:"Record and encrypt speech locally; this does not grant training or sharing rights."},
   {purpose:"local_personalisation",label:"Remember my corrections",detail:"Only apply my chosen text substitutions; neural-model training is not implemented."},
   {purpose:"external_transcription",label:"External transcription",detail:"Disabled in this prototype, even if you express a preference. No audio upload pathway is implemented."},
   {purpose:"research_training",label:"Research model training",detail:"Disabled until independent licensing, ethics, privacy and research-owner approval."},
   {purpose:"research_sharing",label:"Share research data",detail:"Disabled until an approved secure distribution channel and rights assessment exist."}
  ];
  return <ScrollView contentContainerStyle={styles.page}>
   <Text style={styles.title}>Your choices</Text>
   <Text style={styles.help}>Consent is purpose-specific and can be withdrawn. Turning on a preference does not override research or provider safety gates.</Text>
   {notices.map(n=><View key={n.purpose} style={styles.card}>
    <Text style={styles.heading}>{n.label}</Text><Text style={styles.help}>{n.detail}</Text>
    <Text style={styles.label}>Preference: {hasConsent(consent,n.purpose)?"Yes":"No"}</Text>
    <Action title={hasConsent(consent,n.purpose)?"Withdraw permission":"I choose to allow this purpose"} disabled={!db} onPress={()=>change(n.purpose,!hasConsent(consent,n.purpose))}/>
    <Text style={styles.help}>Guardian: {evaluateGuardian({purpose:n.purpose,consentEvents:consent}).decision}</Text>
   </View>)}
   <Text style={styles.warning}>Withdrawal stops future processing; it does not automatically delete previously recorded files. Delete individual recordings in Corpus. Full cryptographic erasure and model-unlearning workflows require further engineering.</Text>
  </ScrollView>;
 }
 if(failure)return <View style={styles.page}><Text style={styles.title}>Private storage unavailable</Text><Text>{failure}</Text><Text>SpeechPrint refuses a plaintext fallback. Use a supported native development build.</Text></View>;
 if(!db)return <View style={styles.page}><ActivityIndicator/><Text>Opening private vault…</Text></View>;
 return <NavigationContainer><Tab.Navigator screenOptions={{headerTitle:"Adtunis SpeechPrint",tabBarActiveTintColor:color,tabBarLabelStyle:{fontSize:15},tabBarStyle:{height:68,paddingBottom:10}}}>
   <Tab.Screen name="Corpus" component={Corpus}/>
   <Tab.Screen name="Personal" component={Personal}/>
   <Tab.Screen name="Consent" component={Consent}/>
  </Tab.Navigator></NavigationContainer>;
}
const styles=StyleSheet.create({
 page:{padding:20,gap:12,backgroundColor:"#fff",flexGrow:1},
 title:{fontSize:27,fontWeight:"700",color:color},
 heading:{fontSize:19,fontWeight:"700",color:color},
 label:{fontSize:16,fontWeight:"600",color:"#173e64"},
 help:{fontSize:16,lineHeight:24,color:"#334155"},
 input:{borderWidth:2,borderColor:"#7b92a7",borderRadius:10,padding:14,fontSize:18,minHeight:52,color:"#111827"},
 button:{backgroundColor:color,padding:17,borderRadius:10,marginVertical:2,minHeight:55,justifyContent:"center"},
 buttonText:{color:"#fff",fontWeight:"700",fontSize:17,textAlign:"center"},
 output:{fontSize:21,lineHeight:30,padding:14,backgroundColor:"#eef6fb",borderRadius:10,minHeight:70},
 card:{borderWidth:1,borderColor:"#c6d7e2",borderRadius:12,padding:14,gap:10},
 warning:{color:"#8a3600",fontSize:16,lineHeight:24,fontWeight:"600"}
});
