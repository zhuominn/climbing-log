// ===== Supabase 初始化 & 全局数据 =====
const supabaseUrl = "https://xcfendynbsrmpgalpefk.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjZmVuZHluYnNybXBnYWxwZWZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0Mjg5NTQsImV4cCI6MjA4MTAwNDk1NH0.Jec4x0rNk5InJUCMwkbPoCYHdWEia1tv3Y1xJCboEpo";

const { createClient } = supabase;
const supabaseClient = createClient(supabaseUrl, supabaseKey);

// 全局攀岩日期列表，供日历和其它模块使用
// 注意：不要用 const，后面会重置它
let climbDays = [];
