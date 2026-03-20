import { useState, useRef } from 'react'
import { supabase } from '../supabase'
import { toMins, fromMins } from './TimePicker'

const inp = {
  width:'100%', background:'var(--white)', border:'1.5px solid var(--border)',
  borderRadius:8, fontFamily:'var(--font-body)', fontSize:'1rem',
  color:'var(--text-primary)', padding:'10px 14px', outline:'none',
  transition:'border-color 180ms'
}
const lbl = {
  display:'block', fontSize:'0.68rem', fontWeight:500, letterSpacing:'0.08em',
  textTransform:'uppercase', color:'var(--text-secondary)', marginBottom:6,
  fontFamily:'var(--font-body)'
}
const card = {
  background:'var(--white)', borderRadius:'var(--r-lg)',
  border:'1px solid var(--border-soft)', padding:'20px'
}
const btnPill = {
  background:'var(--green-primary)', color:'var(--text-on-dark)', border:'none',
  borderRadius:'var(--r-full)', fontFamily:'var(--font-body)', fontSize:'0.82rem',
  fontWeight:500, padding:'9px 22px', cursor:'pointer',
  transition:'background 180ms'
}
const btnGhost = {
  background:'var(--white)', color:'var(--text-secondary)',
  border:'1.5px solid var(--border)', borderRadius:'var(--r-full)',
  fontFamily:'var(--font-body)', fontSize:'0.82rem', fontWeight:500,
  padding:'9px 22px', cursor:'pointer', transition:'all 180ms'
}

function focus(e) { e.target.style.borderColor = '#999' }
function blur(e) { e.target.style.borderColor = 'var(--border)' }

function TimeBox({ val, onChange, unit }) {
  return (
    <div style={{ position:'relative', width:72 }}>
      <input
        type="number" min="0" value={val}
        onChange={e => onChange(e.target.value)}
        placeholder="0"
        onFocus={focus} onBlur={blur}
        style={{ ...inp, width:72, padding:'10px 22px 10px 10px', fontSize:'0.9rem' }}
      />
      <span style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)',
        fontSize:'0.7rem', color:'var(--text-tertiary)', pointerEvents:'none' }}>{unit}</span>
    </div>
  )
}

export default function RecipeForm({ recipe, onBack, onSave }) {
  const isEdit = !!recipe
  const [name, setName] = useState(recipe?.name || '')
  const [description, setDescription] = useState(recipe?.description || '')

  const ai = fromMins(recipe?.active_time_mins)
  const ti = fromMins(recipe?.total_time_min)
  const tx = fromMins(recipe?.total_time_max)
  const [aH, setAH] = useState(ai.hours || '')
  const [aM, setAM] = useState(ai.minutes || '')
  const [tMinH, setTMinH] = useState(ti.hours || '')
  const [tMinM, setTMinM] = useState(ti.minutes || '')
  const [tMaxH, setTMaxH] = useState(tx.hours || '')
  const [tMaxM, setTMaxM] = useState(tx.minutes || '')
  const [serves, setServes] = useState(recipe?.serves || '')
  const [ingredients, setIngredients] = useState(
    recipe?.ingredients?.length ? recipe.ingredients : [{ name:'', amount:'', optional:false }]
  )
  const [steps, setSteps] = useState(recipe?.steps?.join('\n') || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const ingRefs = useRef([])

  function updateIng(i, field, value) {
    const u = [...ingredients]; u[i] = { ...u[i], [field]:value }; setIngredients(u)
  }
  function addIng() {
    setIngredients(p => [...p, { name:'', amount:'', optional:false }])
    setTimeout(() => { ingRefs.current[ingredients.length]?.focus() }, 30)
  }
  function removeIng(i) {
    if (ingredients.length > 1) setIngredients(ingredients.filter((_,idx) => idx !== i))
  }

  async function handleSave() {
    if (!name.trim()) { setError('Please add a recipe name.'); return }
    setSaving(true); setError('')
    const payload = {
      name: name.trim(), description: description.trim() || null,
      active_time_mins: toMins(aH, aM),
      total_time_min: toMins(tMinH, tMinM),
      total_time_max: toMins(tMaxH, tMaxM),
      serves: serves ? parseInt(serves) : null,
      ingredients: ingredients.filter(i => i.name.trim()).map(i => ({
        name: i.name.trim(), amount: i.amount.trim(), optional: i.optional || false
      })),
      steps: steps.split('\n').map(s => s.trim()).filter(Boolean),
    }
    let err
    if (isEdit) { ({ error:err } = await supabase.from('recipes').update(payload).eq('id', recipe.id)) }
    else { ({ error:err } = await supabase.from('recipes').insert(payload)) }
    setSaving(false)
    if (err) { setError('Something went wrong. Please try again.'); return }
    onSave()
  }

  return (
    <div className="min-h-screen" style={{ background:'var(--cream)' }}>

      {/* Nav */}
      <div style={{ background:'var(--white)', borderBottom:'1px solid var(--border-soft)' }}
        className="px-5 py-4 flex items-center justify-between sticky top-0 z-10">
        <button onClick={onBack} style={{ fontSize:'0.9rem', color:'var(--text-secondary)',
          background:'none', border:'none', cursor:'pointer', fontFamily:'var(--font-body)' }}>
          Cancel
        </button>
        <span style={{ fontFamily:'var(--font-display)', fontSize:'1.1rem',
          fontWeight:400, color:'var(--text-primary)' }}>
          {isEdit ? 'Edit recipe' : 'New recipe'}
        </span>
        <button onClick={handleSave} disabled={saving} style={{ ...btnPill, opacity:saving?0.6:1 }}
          onMouseEnter={e => e.target.style.background='var(--green-mid)'}
          onMouseLeave={e => e.target.style.background='var(--green-primary)'}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>

      <div className="mx-4 mt-4 pb-10" style={{ display:'flex', flexDirection:'column', gap:12 }}>
        {error && (
          <div style={{ background:'#FFF0F0', border:'1px solid #F5BABA', color:'#A03030',
            fontSize:'0.85rem', padding:'12px 16px', borderRadius:8, fontFamily:'var(--font-body)' }}>
            {error}
          </div>
        )}

        {/* Name + Notes */}
        <div style={card} className="space-y-4">
          <div>
            <label style={lbl}>Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="Recipe name" style={inp} onFocus={focus} onBlur={blur} />
          </div>
          <div>
            <label style={lbl}>Notes</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Any context, variations, or reminders…" rows={3}
              style={{ ...inp, resize:'none', lineHeight:1.6 }} onFocus={focus} onBlur={blur} />
          </div>
        </div>

        {/* Time */}
        <div style={card}>
          <div className="time-section">

            {/* Total time — left */}
            <div className="time-block">
              <label style={lbl}>Total time</label>
              <p style={{ fontSize:'0.68rem', color:'var(--text-secondary)', fontFamily:'var(--font-body)', marginBottom:8 }}>
                Min to max range
              </p>
              <div className="time-pair">
                <TimeBox val={tMinH} onChange={setTMinH} unit="h" />
                <TimeBox val={tMinM} onChange={setTMinM} unit="m" />
              </div>
              <p style={{ fontSize:'0.65rem', color:'var(--text-secondary)', fontFamily:'var(--font-body)', margin:'4px 0' }}>
                to (optional max)
              </p>
              <div className="time-pair">
                <TimeBox val={tMaxH} onChange={setTMaxH} unit="h" />
                <TimeBox val={tMaxM} onChange={setTMaxM} unit="m" />
              </div>
            </div>

            {/* Active time — right */}
            <div className="time-block">
              <label style={lbl}>Active time</label>
              <p style={{ fontSize:'0.68rem', color:'var(--text-secondary)', fontFamily:'var(--font-body)', marginBottom:8 }}>
                Hands-on cooking
              </p>
              <div className="time-pair">
                <TimeBox val={aH} onChange={setAH} unit="h" />
                <TimeBox val={aM} onChange={setAM} unit="m" />
              </div>
            </div>

          </div>
        </div>

                {/* Ingredients + Serves */}
        <div style={card}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
            <label style={{ ...lbl, margin:0 }}>Ingredients</label>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:'0.78rem', color:'var(--text-secondary)',
                fontFamily:'var(--font-body)' }}>Serves</span>
              <input type="number" value={serves} onChange={e => setServes(e.target.value)}
                placeholder="—"
                style={{ width:52, background:'var(--cream)', border:'1.5px solid var(--border)',
                  borderRadius:8, fontFamily:'var(--font-body)', fontSize:'0.9rem',
                  color:'var(--text-primary)', padding:'6px 8px', outline:'none', textAlign:'center' }}
                onFocus={focus} onBlur={blur}
              />
            </div>
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {ingredients.map((ing, i) => (
              <div key={i} style={{ display:'flex', flexDirection:'column', gap:0 }}>
                <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                  <input ref={el => ingRefs.current[i] = el} type="text" value={ing.name}
                    onChange={e => updateIng(i, 'name', e.target.value)} placeholder="Ingredient"
                    style={{ ...inp, flex:1, fontSize:'0.9rem', padding:'9px 11px' }}
                    onFocus={focus} onBlur={blur}
                  />
                  <input type="text" value={ing.amount}
                    onChange={e => updateIng(i, 'amount', e.target.value)} placeholder="Amount"
                    style={{ ...inp, width:82, fontSize:'0.9rem', padding:'9px 11px' }}
                    onFocus={focus} onBlur={blur}
                  />
                  {ingredients.length > 1 && (
                    <button onClick={() => removeIng(i)}
                      style={{ color:'var(--border)', background:'none', border:'none',
                        cursor:'pointer', fontSize:'1.2rem', lineHeight:1, width:22, flexShrink:0 }}>×</button>
                  )}
                </div>
                <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer',
                  width:'fit-content', marginLeft:2, marginTop:10 }}>
                  <input type="checkbox" checked={ing.optional || false}
                    onChange={e => updateIng(i, 'optional', e.target.checked)}
                    style={{ width:18, height:18, accentColor:'var(--green-primary)', cursor:'pointer', flexShrink:0 }} />
                  <span style={{ fontSize:'0.78rem', color:'var(--text-secondary)',
                    fontFamily:'var(--font-body)' }}>Optional</span>
                </label>
              </div>
            ))}
          </div>

          <button onClick={addIng}
            style={{ marginTop:14, fontSize:'0.82rem', color:'var(--text-secondary)',
              background:'none', border:'none', cursor:'pointer', fontFamily:'var(--font-body)' }}
            onMouseEnter={e => e.target.style.color='var(--green-primary)'}
            onMouseLeave={e => e.target.style.color='var(--text-secondary)'}>
            + Add ingredient
          </button>
        </div>

        {/* Steps */}
        <div style={card}>
          <label style={lbl}>Steps</label>
          <textarea value={steps} onChange={e => setSteps(e.target.value)} rows={6}
            placeholder={"Write each step on a new line…\n\nBoil pasta in salted water\nFry garlic in olive oil\nToss together and serve"}
            style={{ ...inp, resize:'none', lineHeight:1.65 }} onFocus={focus} onBlur={blur}
          />
          <p style={{ fontSize:'0.72rem', color:'var(--text-tertiary)', marginTop:6,
            fontFamily:'var(--font-body)' }}>Each line becomes a numbered step</p>
        </div>

        {/* Bottom actions */}
        <div style={{ display:'flex', gap:10, justifyContent:'flex-end', paddingBottom:8 }}>
          <button onClick={onBack} style={btnGhost}>Cancel</button>
          <button onClick={handleSave} disabled={saving}
            style={{ ...btnPill, opacity:saving?0.6:1 }}
            onMouseEnter={e => e.target.style.background='var(--green-mid)'}
            onMouseLeave={e => e.target.style.background='var(--green-primary)'}>
            {saving ? 'Saving…' : 'Save recipe'}
          </button>
        </div>
      </div>
    </div>
  )
}
