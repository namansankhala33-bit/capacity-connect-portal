export default function NewUIBackground() {
  return (
    <>
      <div className="new-ui-mesh" />
      <div className="new-ui-blob new-ui-blob-1" />
      <div className="new-ui-blob new-ui-blob-2" />
      <div className="new-ui-blob new-ui-blob-3" />
      <div className="new-ui-blob new-ui-blob-4" />
      <div className="new-ui-grid-overlay" />
      <div className="new-ui-halo" style={{ width: 420, height: 420, top: -120, right: -140 }} />
      <div className="new-ui-halo" style={{ width: 520, height: 520, bottom: -180, left: -160, animationDuration: '160s' }} />
    </>
  );
}