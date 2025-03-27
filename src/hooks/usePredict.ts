import {
  predict,
  getRawFaceValidationStatus,
  getRawSpoofStatusMessage,
  getStatusMessage,
} from "@privateid/ultra-web-sdk-alpha";
import { useState } from "react";
import { useSession } from "context/SessionContext";
import { useSearchParams } from "react-router-dom";
import { ErrorCode } from "types";

let skipAntispoofProcess = false;
let identifierGlobal: any = undefined;
let collectionNameGlobal: any = undefined;

let mf_count = 3;
let portrait: ImageData | null = null;

let max_spoof_attempt = 3;
let spoof_attempt = 0;

let isRunning = false;
const usePredict = (onSuccess: () => void, onFailure: () => void) => {
  const [searchParams] = useSearchParams();
  const [multiframePredictValidationStatus, setEnrollValidationStatus] =
    useState("");
  const [progress, setProgress] = useState(0);
  const [multiframePredictEmbeddings, setEnrollEmbeddings] = useState("");
  const [multiframePredictPortrait, setMultiframePredictPortrait] =
    useState<ImageData | null>(null);
  const { sendCode } = useSession();

  const mf_count_override = searchParams.get("mf_count_signin")
    ? Number(searchParams.get("mf_count_signin"))
    : mf_count;

  const final_spoof_attempt = searchParams.get("spoof_attempt")
    ? Number(searchParams.get("spoof_attempt"))
    : max_spoof_attempt;

  const debugType = searchParams.get("debug_type");
  let enrollTokenCurrent;
  const callback = async (result: any) => {
    console.log("-------useMultiFrameFaceLogin-------");
    console.log("facelogin callback hook result:", result);
    console.log("skipping antispoof?", skipAntispoofProcess);
    const token = result.mf_token;
    if (token) {
      setProgress((p) => {
        if (p >= 100) return 100;
        return p + 100 / mf_count_override;
      });
    } else {
      setProgress(0);
    }
    if (
      (result?.api_response && result?.api_response?.success) ||
      (result?.api_response && result?.api_response?.success === false)
    ) {
      if (result?.api_response?.tryAgain) {
        doFaceLogin(
          result.mf_token,
          skipAntispoofProcess,
          collectionNameGlobal,
          identifierGlobal
        );
      } else {
        setProgress(100);
        setEnrollValidationStatus("Success");
        console.log("-------here------");
        setMultiframePredictPortrait(portrait as ImageData);

        setEnrollEmbeddings("SUCCESS");

        onSuccess();
        isRunning = false;
      }
    } else if (
      result?.api_response &&
      result?.api_response?.statusCode !== 200
    ) {
      setProgress(0);
      onFailure();
      isRunning = false;
    } else if (result.antispoof_status === 1) {
      spoof_attempt++;
      setProgress(0);
      if (spoof_attempt >= final_spoof_attempt) {
        console.log("Spoof attempt exceeded");

        await sendCode(ErrorCode.SPOOF);
        doFaceLogin(
          result.mf_token,
          skipAntispoofProcess,
          collectionNameGlobal,
          identifierGlobal
        );
      } else {
        doFaceLogin(
          result.mf_token,
          skipAntispoofProcess,
          collectionNameGlobal,
          identifierGlobal
        );
      }
    } else {
      const newMessage =
        debugType === "3"
          ? `Face Validation: ${getRawFaceValidationStatus(
              result.face_validation_status
            )} ---
       
          Anti spoof: ${getRawSpoofStatusMessage(result.antispoof_status)}`
          : getStatusMessage(result.face_validation_status);

      setEnrollValidationStatus(newMessage);

      // setEnrollStatus(result.face_validation_status);
      doFaceLogin(
        result.mf_token,
        skipAntispoofProcess,
        collectionNameGlobal,
        identifierGlobal
      );
    }
  };

  const multiframePredict = async () => {
    if (!isRunning) {
      doFaceLogin();
      isRunning = true;
    }
  };

  const doFaceLogin = async (
    token = "",
    skipAntispoof = false,
    collectionName = "",
    identifier = ""
  ) => {
    console.log("ENROLLING");
    enrollTokenCurrent = token;
    skipAntispoofProcess = skipAntispoof;
    collectionNameGlobal = collectionName;
    identifierGlobal = identifier;
    // eslint-disable-next-line no-unused-vars
    const predictPortrait = await predict({
      returnPortrait: true,
      callback: callback,
      config: {
        input_image_format: "rgba",
        mf_token: token,
        mf_count_override: 3, // default 5 frames, 
        // skip_antispoof: false, in case of true, antispoof will not be performed
      },
    });
    portrait = predictPortrait as ImageData;
  };

  return {
    multiframePredictEmbeddings,
    multiframePredictValidationStatus,
    multiframePredict,
    multiframePredictPortrait,
    progress,
  };
};

export default usePredict;
