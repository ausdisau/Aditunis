<script setup lang="ts">
import {ref,computed} from "vue";
const raw=ref("");
const records=computed(()=>raw.value.split("\n").filter(Boolean).flatMap(line=>{try{return [JSON.parse(line)]}catch{return []}}));
const sameSpeaker=computed(()=>{const map=new Map<string,Set<string>>();for(const r of records.value){if(r.speaker_id&&r.split){if(!map.has(r.speaker_id))map.set(r.speaker_id,new Set());map.get(r.speaker_id)!.add(r.split)}}return [...map.entries()].filter(([_,s])=>s.size>1).map(([id])=>id)});
</script>
<template><main><h1>SpeechPrint Research Review (offline)</h1><p>Paste de-identified metadata JSONL. This screen does not load or transmit audio. Never include names, private transcripts or participant IDs.</p><label for="meta">De-identified manifest records</label><textarea id="meta" v-model="raw" rows="12" placeholder='{"speaker_id":"synthetic_a","split":"train"}'></textarea><p>Parsed records: {{records.length}}</p><p :role="sameSpeaker.length?'alert':'status'">Speakers spanning multiple splits: {{sameSpeaker.length}}</p><ul><li v-for="id in sameSpeaker" :key="id">Review split leakage for {{id}}</li></ul><p><strong>Advisory only:</strong> This is not a complete corpus validation or an export clearance.</p></main></template>
<style>body{font:18px system-ui;background:#f5f8fb;color:#163856}main{max-width:820px;margin:auto;padding:24px}textarea{width:100%;box-sizing:border-box;font:16px monospace;border:2px solid #72899c;padding:12px}p{line-height:1.6}</style>
