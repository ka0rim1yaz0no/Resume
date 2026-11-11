export function SceneEnvironments() {
  return <div className="scene-environments" aria-hidden="true">
    <div className="scene-environment scene-environment-systems">
      <div className="scene-horizon" />
      <div className="scene-orbit" />
    </div>
    <div className="scene-environment scene-environment-interfaces">
      <div className="scene-type-wall"><span>API</span><span>Data</span><span>Logic</span></div>
      <div className="scene-browser"><span className="stage-window-lights" /></div>
    </div>
    <div className="scene-environment scene-environment-workflow">
      <div className="scene-boards"><i /><i /><i /></div>
    </div>
  </div>
}
