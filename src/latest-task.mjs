// One running task and one replaceable pending input; never grow a voice/video backlog.
export function latestTask(run){
 let pending=null,active=null,generation=0;
 return {
  push(value){pending={value,generation};if(!active){active=(async()=>{try{while(pending){const next=pending;pending=null;await run(next.value,()=>next.generation===generation&&!pending);}}finally{active=null;}})();}return active;},
  clear(){generation++;pending=null;},
 };
}
