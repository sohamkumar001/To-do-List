import { MascotState } from '../types.ts';

interface Props {
  state: MascotState;
  speech: string;
}

export default function PixelGuardian({ state, speech }: Props) {
  return (
    <>
      {speech && (
        <div 
          className="fixed bottom-[110px] right-[30px] w-[250px] bg-white border-[4px] border-black p-[15px] shadow-[6px_6px_0px_rgba(0,0,0,0.3)] z-[100] text-[10px] leading-relaxed text-black select-text before:content-[''] before:absolute before:bottom-[-16px] before:right-[20px] before:border-t-[12px] before:border-t-black before:border-r-[12px] before:border-r-transparent max-md:bottom-[20px] max-md:right-[20px] max-md:w-[calc(100%-40px)]"
        >
          {speech}
        </div>
      )}
      <div 
        className={`fixed bottom-[30px] right-[30px] w-16 h-16 border-[4px] border-black shadow-[6px_6px_0px_rgba(0,0,0,0.3)] z-[100] 
          ${state === MascotState.IDLE ? 'anim-idle bg-manga-blue' : 'anim-cheer'}
          before:content-[''] before:absolute before:top-4 before:left-3 before:w-2 before:h-2 before:bg-white before:shadow-[24px_0_0_white]`}
      />
    </>
  );
}
