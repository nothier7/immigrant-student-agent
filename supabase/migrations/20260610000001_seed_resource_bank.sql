-- Layer 1: seed the resource bank with the curated resources that previously
-- lived as a hardcoded string in src/app/backend/agent.py.
-- Only fields we know; status defaults to 'unverified' and deadline stays null
-- until the verifier (Layer 3) finds one.

insert into public.resource_bank (name, description, url, category, authority, source_tier, tags) values
  (
    'CCNY Immigrant Student Center',
    'Advising, events, legal referrals, and resources for undocumented and immigrant students at City College of New York.',
    'https://www.ccny.cuny.edu/immigrantstudentcenter',
    'advising', 'CCNY', 0,
    array['undocumented', 'daca', 'general']
  ),
  (
    'CCNY In-State Tuition Guide',
    'How to qualify for in-state (resident) tuition at CUNY without citizenship: NYS high school for 2+ years with NY diploma/GED, or 12+ months NY domicile with proof. Requires an affidavit; applies to undocumented, DACA, TPS, and other non-citizen students.',
    'https://www.ccny.cuny.edu/immigrantstudentcenter/qualifying-for-in-state-tuition',
    'tuition', 'CCNY', 0,
    array['in-state-tuition', 'undocumented', 'daca']
  ),
  (
    'CCNY Scholarships for Immigrant Students',
    'Curated list of scholarships for undocumented/DACA students including TheDream.US, Golden Door Scholars, Hispanic Scholarship Fund, and CCNY-specific awards.',
    'https://www.ccny.cuny.edu/immigrantstudentcenter/scholarships',
    'scholarship', 'CCNY', 0,
    array['scholarship', 'undocumented', 'daca', 'financial-aid']
  ),
  (
    'CCNY Financial Aid for Undocumented Students',
    'Undocumented students cannot access federal FAFSA but CAN access NYS Dream Act / TAP (state aid through HESC), institutional scholarships, and private scholarships that do not require citizenship.',
    'https://www.ccny.cuny.edu/immigrantstudentcenter/financial-aid',
    'grant', 'CCNY', 0,
    array['financial-aid', 'undocumented', 'daca']
  ),
  (
    'CCNY Dream Team',
    'Peer support organization for immigrant/undocumented students. Offers community, events, and advocacy training.',
    'https://www.ccny.cuny.edu/immigrantstudentcenter/ccny-dream-team',
    'advising', 'CCNY', 0,
    array['undocumented', 'general']
  ),
  (
    'NYS Dream Act (TAP/State Aid)',
    'The Jose Peralta NYS Dream Act allows eligible undocumented students to apply for state financial aid including TAP, part-time TAP, and other state-funded scholarships. Apply through the HESC Dream Act Application (not FAFSA).',
    'https://www.hesc.ny.gov/applying-aid/nys-dream-act/',
    'grant', 'HESC', 0,
    array['financial-aid', 'undocumented', 'daca', 'in-state-tuition']
  ),
  (
    'TheDream.US National Scholarship',
    'National scholarships for undocumented/DACA students. Offers National Scholarship (up to full tuition) and Opportunity Scholarship. Deadlines are seasonal (typically fall and spring).',
    'https://www.thedream.us/scholarships/national-scholarship/',
    'scholarship', 'TheDream.US', 1,
    array['scholarship', 'undocumented', 'daca', 'financial-aid']
  ),
  (
    'Immigrants Rising Scholarship Database',
    'Regularly updated database of 100+ scholarships that do not require proof of citizenship or legal status.',
    'https://immigrantsrising.org/resource/scholarships/',
    'scholarship', 'Immigrants Rising', 1,
    array['scholarship', 'undocumented', 'daca', 'financial-aid', 'work-authorization']
  )
on conflict (url) do nothing;
