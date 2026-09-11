import { useState } from 'react';
import { useApp } from '../../context/AppContext';

export default function CourseBuilder() {
  const { currentUser, createCourseBundle, competencies, courses } = useApp();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Forecasting Science');
  const [duration, setDuration] = useState('12 hours');
  const [developedComps, setDevelopedComps] = useState([]);
  const [moduleRows, setModuleRows] = useState([
    { title: '', content_text: '', video_placeholder_url: '' },
    { title: '', content_text: '', video_placeholder_url: '' },
  ]);
  const [saved, setSaved] = useState(false);
  const [errMsg, setErrMsg] = useState('');

  function toggleComp(id) {
    setDevelopedComps(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  }

  function updateModule(idx, field, value) {
    setModuleRows(prev => prev.map((m, i) => i === idx ? { ...m, [field]: value } : m));
  }

  function addModule() {
    setModuleRows(prev => [...prev, { title: '', content_text: '', video_placeholder_url: '' }]);
  }

  function removeModule(idx) {
    setModuleRows(prev => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrMsg('');
    const cleanModules = moduleRows
      .filter(m => m.title.trim() !== '')
      .map((m, i) => ({ ...m, title: m.title.trim(), content_text: m.content_text.trim() }));
    try {
      await createCourseBundle({
        course: { title, description, category, duration, developed_competencies: developedComps, materials_library: {} },
        moduleRows: cleanModules,
        exam: null,
        trainerId: currentUser.id,
      });
      setSaved(true);
      setTimeout(() => {
        setTitle(''); setDescription(''); setDevelopedComps([]);
        setModuleRows([{ title: '', content_text: '', video_placeholder_url: '' }, { title: '', content_text: '', video_placeholder_url: '' }]);
        setSaved(false);
      }, 2000);
    } catch (err) {
      setErrMsg(err.message || 'Course publish failed.');
    }
  }

  return (
    <div>
      {saved && (
        <div className="skill-gap-alert normal" style={{ marginBottom: '20px' }}>
          <strong>✅ Model course published!</strong> Modules are stored and the course is now live in the programme corpus.
          Design its assessment from the Assessment Design view.
        </div>
      )}
      {errMsg && (
        <div className="skill-gap-alert high" style={{ marginBottom: '20px' }}>
          <strong>✗ {errMsg}</strong>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-2" style={{ marginBottom: '20px' }}>
          <div className="card">
            <div className="card-header"><h3>Course Profile</h3></div>
            <div className="card-body">
              <div className="form-group">
                <label>Course Title</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Data Assimilation Techniques for NWP" required />
              </div>
              <div className="form-group">
                <label>Course Description</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Operational objective of this training model course" rows={4} required />
              </div>
              <div className="grid grid-2" style={{ gap: '16px' }}>
                <div className="form-group">
                  <label>Category</label>
                  <select value={category} onChange={e => setCategory(e.target.value)}>
                    {['Forecasting Science', 'Remote Sensing', 'Radar Meteorology', 'Severe Weather', 'Applied Services', 'Hydrometeorology', 'Climate Science', 'Aviation'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Contact Hours</label>
                  <select value={duration} onChange={e => setDuration(e.target.value)}>
                    {['6 hours', '8 hours', '10 hours', '12 hours', '14 hours', '16 hours', '18 hours', '20 hours'].map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Developed Meteorological Competencies</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {competencies.map(comp => (
                    <button
                      key={comp.id}
                      type="button"
                      onClick={() => toggleComp(comp.id)}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '20px',
                        border: developedComps.includes(comp.id) ? '2px solid var(--primary)' : '1px solid var(--border)',
                        background: developedComps.includes(comp.id) ? 'var(--primary)' : 'var(--bg-card)',
                        color: developedComps.includes(comp.id) ? '#fff' : 'var(--text)',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'var(--transition)'
                      }}
                    >
                      {comp.competency_name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3>Training Modules</h3>
              <button type="button" className="btn btn-outline btn-sm" onClick={addModule}>+ Add Module</button>
            </div>
            <div className="card-body">
              {moduleRows.map((mod, idx) => (
                <div key={idx} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px', marginBottom: '16px', background: 'var(--bg)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontWeight: 700, fontSize: '13px' }}>Module {idx + 1}</span>
                    {moduleRows.length > 1 && (
                      <button type="button" className="btn btn-danger btn-sm" onClick={() => removeModule(idx)}>Remove</button>
                    )}
                  </div>
                  <div className="form-group">
                    <input type="text" value={mod.title} onChange={e => updateModule(idx, 'title', e.target.value)} placeholder="Module title" />
                  </div>
                  <div className="form-group">
                    <textarea value={mod.content_text} onChange={e => updateModule(idx, 'content_text', e.target.value)} placeholder="Module study content (operational notes)" rows={3} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <input type="text" value={mod.video_placeholder_url} onChange={e => updateModule(idx, 'video_placeholder_url', e.target.value)} placeholder="Recorded lecture / material URL" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <button type="submit" className="btn btn-success btn-lg" style={{ width: '100%' }}>
          💾 Publish Model Course
        </button>
      </form>

      <div className="card" style={{ marginTop: '24px' }}>
        <div className="card-header"><h3>Programme Corpus</h3></div>
        <div className="card-body" style={{ padding: '12px 24px' }}>
          {courses.filter(c => c.trainer_id === currentUser?.id).map(course => (
            <div key={course.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '14px' }}>{course.title}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{course.category} · {course.duration} · {course.developed_competencies?.length} competencies mapped</div>
              </div>
              <span className="badge badge-success">Published</span>
            </div>
          ))}
          {courses.filter(c => c.trainer_id === currentUser?.id).length === 0 && (
            <div className="empty-state"><h3>No authored courses yet</h3><p>Use the builder above to publish your first meteorological model course.</p></div>
          )}
        </div>
      </div>
    </div>
  );
}