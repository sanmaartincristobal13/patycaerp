const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

module.exports = async (req, res) => {
  const { data, error } = await supabase.from('clientes').select('*')
  if (error) return res.status(500).json({ error: error.message })
  res.status(200).json(data)
}