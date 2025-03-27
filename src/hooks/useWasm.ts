import { useState, useEffect, useContext } from "react";
import { loadPrivIdModule } from "@privateid/ultra-web-sdk-alpha";

const useWasm = () => {
  // Initialize the state
  const [ready, setReady] = useState(false);
  const [wasmStatus, setWasmStatus] = useState<any>({ isChecking: true });
  const [isLoading, setIsLoading] = useState(false);


  const wasmFailureCallback = (result: any) => {
    console.log("WASM ERROR RESULT: ", result);

    // THis function triggers if something in the loading of models fails
  }

  const init = async () => {
    setIsLoading(true);
    const default_url = "https://api-orchestration-uatv3.privateid.com/"

    const public_key = fetch("https://api-orchestration-uatv3.privateid.com/public-key"); // you can save this
    
    const getToken = ()=>{
      return "POST /v2/verification-session" 
    }

    const sessionToken = getToken();

    const isSupported = await loadPrivIdModule({
      api_url: {
        collections: {
          default: {
            named_urls: {
              base_url: default_url,
            } as any,
          },
        },
      },
      sessionToken: sessionToken,
      publicKey: public_key,
      wasmFailureCallback: wasmFailureCallback,
    });
    console.log({isSupported})

    if (isSupported.support) {
      setReady(true);
      setWasmStatus({ isChecking: false, ...isSupported });
      // setIsWasmLoaded(true);
    } else {
      setReady(false);
      setWasmStatus({ isChecking: false, ...isSupported });
    }

    setIsLoading(false);
  };


  return { ready, wasmStatus, init, isLoading };
};

export default useWasm;
