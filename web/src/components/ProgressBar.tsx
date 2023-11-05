
interface ProgressBarProps {
  progress: number;
}

export function ProgressBar( props: ProgressBarProps){
 
  return (
    <div className="h-3 rounded-xl bg-zinc-700 w-full mt-4">
          <div 
          role="progressbar" //Indicar pro site que a div está se comportando como outro elemento, nesse caso um progressbar
          aria-label="Progesso de hábitos completados nesse dia"
          aria-valuenow={props.progress}
          className="h-3 rounded-lg bg-violet-600 transition-all"
          style={{
            width: `${props.progress}%`
          }}
          />     
    </div>
  )
}