"""Seed curated CCNY resources into Supabase.

Run with: `uv run python seed_data.py`
Requires SUPABASE_URL and SUPABASE_SERVICE_KEY in the environment.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Dict, List

from dotenv import load_dotenv
import requests
from supabase import Client, create_client

BASE_DIR = Path(__file__).resolve().parent


def load_env() -> None:
  # Load local .env if present so developers can run the script easily.
  env_path = BASE_DIR / ".env"
  if env_path.exists():
    load_dotenv(env_path)


def get_client() -> Client:
  url = os.getenv("SUPABASE_URL")
  key = os.getenv("SUPABASE_SERVICE_KEY")
  if not url or not key:
    raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_KEY are required to run the seed script.")
  return create_client(url, key)


def mark_inactive_dead_links(rows: List[Dict[str, Any]], *, label: str, timeout: int = 5, inactive_status: str = "archived") -> None:
  for row in rows:
    url = row.get("url")
    if not url:
      continue
    row.setdefault("status", "active")
    try:
      response = requests.head(url, allow_redirects=True, timeout=timeout)
      if response.status_code in (400, 401, 403, 405):
        response = requests.get(url, allow_redirects=True, timeout=timeout)
    except requests.RequestException as exc:
      print(f"[seed][{label}] warning: unable to verify {url} ({exc})")
      continue

    if response.status_code in (404, 410):
      if row.get("status") != inactive_status:
        print(f"[seed][{label}] {url} returned {response.status_code}; marking status {inactive_status}")
      row["status"] = inactive_status


def scholarships_payload() -> List[Dict[str, Any]]:
  return [
      {
          "name": "NYS Dream Act Tuition Assistance Program (TAP)",
          "url": "https://www.hesc.ny.gov/applying-aid/nys-dream-act/",
          "description": "State aid covering tuition for eligible undocumented, DACA, and other non-citizen students attending New York colleges.",
          "category": "scholarship",
          "authority": "HESC",
          "deadline": "rolling",
          "eligibility_tags": ["undocumented", "daca", "ny-resident", "state-aid"],
          "schools": ["ccny", "all-cuny"],
          "status": "active",
      },
      {
          "name": "TheDream.US National Scholarship",
          "url": "https://www.thedream.us/scholarships/national-scholarship/",
          "description": "Covers tuition and fees up to a bachelor's degree for first-time college students with DACA/TPS/undocumented status.",
          "category": "scholarship",
          "authority": "TheDream.US",
          "deadline": "seasonal",
          "eligibility_tags": ["undocumented", "daca", "first-time", "undergrad"],
          "schools": ["ccny", "all-cuny"],
          "status": "active",
      },
      {
          "name": "TheDream.US Opportunity Scholarship",
          "url": "https://www.thedream.us/scholarships/opportunity-scholarship/",
          "description": "Full-ride scholarship for Dreamers who live in states without affordable in-state tuition options.",
          "category": "scholarship",
          "authority": "TheDream.US",
          "deadline": "seasonal",
          "eligibility_tags": ["undocumented", "daca", "out-of-state", "undergrad"],
          "schools": ["ccny"],
          "status": "active",
      },
      {
          "name": "CUNY Becas Scholarship Program",
          "url": "https://www.lehman.edu/cuny-mexican-studies-institute/scholarships/",  # REPLACED
          "description": "Scholarships for immigrant students committed to academic excellence and community engagement across CUNY.",
          "category": "scholarship",
          "authority": "CUNY Mexican Studies Institute (Lehman)",  # UPDATED
          "deadline": "Jan 15",
          "eligibility_tags": ["undocumented", "latinx", "community-service"],
          "schools": ["ccny", "all-cuny"],
          "status": "active",
      },
      {
          "name": "Golden Door Scholars",
          "url": "https://www.goldendoorscholars.org/",
          "description": "Up to full tuition for high-achieving undocumented or DACA students pursuing bachelor's degrees.",
          "category": "scholarship",
          "authority": "Golden Door Scholars",
          "deadline": "Oct 1",
          "eligibility_tags": ["undocumented", "daca", "stem", "undergrad"],
          "schools": ["ccny"],
          "status": "active",
      },
      {
          "name": "Hispanic Scholarship Fund",
          "url": "https://www.hsf.net/scholarship",
          "description": "Supports Hispanic students with awards up to $5,000; DACA recipients are eligible.",
          "category": "scholarship",
          "authority": "HSF",
          "deadline": "Feb 15",
          "amount_min": 500,
          "amount_max": 5000,
          "eligibility_tags": ["latinx", "daca", "undergrad", "graduate"],
          "schools": ["ccny"],
          "status": "active",
      },
      {
          "name": "Ascend Educational Fund Scholarship",
          "url": "https://ascendfundny.org/scholarship/",
          "description": "Awards $2,500-$20,000 to immigrant students graduating from New York City high schools.",
          "category": "scholarship",
          "authority": "Ascend Educational Fund",
          "deadline": "Mar 31",
          "amount_min": 2500,
          "amount_max": 20000,
          "eligibility_tags": ["immigrant", "nyc-high-school", "undergrad"],
          "schools": ["ccny"],
          "status": "active",
      },
      {
          "name": "Esperanza Fund Scholarship",
          "url": "https://www.esperanzafund.org/scholarship",
          "description": "Scholarships up to $20,000 for immigrant students with high financial need.",
          "category": "scholarship",
          "authority": "Esperanza Fund",
          "deadline": "Mar 1",
          "amount_min": 5000,
          "amount_max": 20000,
          "eligibility_tags": ["immigrant", "financial-need", "undergrad"],
          "schools": ["ccny"],
          "status": "active",
      },
      {
          "name": "MPOWER Global Citizen Scholarship",
          "url": "https://www.mpowerfinancing.com/scholarships/global-citizen/",
          "description": "Quarterly awards for international and DACA students pursuing degrees in the US or Canada.",
          "category": "scholarship",
          "authority": "MPOWER Financing",
          "deadline": "quarterly",
          "amount_min": 1000,
          "amount_max": 10000,
          "eligibility_tags": ["daca", "international", "undergrad", "graduate"],
          "schools": ["ccny"],
          "status": "active",
      },
      {
          "name": "La Unidad Latina Foundation Scholarship",
          "url": "https://www.lulf.org/scholarships",
          "description": "Awards for Latinx students with a history of community service; open to undocumented and DACA students.",
          "category": "scholarship",
          "authority": "La Unidad Latina Foundation",
          "deadline": "Nov 1",
          "eligibility_tags": ["latinx", "community-service", "daca", "undergrad", "graduate"],
          "schools": ["ccny"],
          "status": "active",
      },
      {
          "name": "SHPE Foundation Scholarship Program",
          "url": "https://www.shpe.org/students/scholarships",
          "description": "STEM scholarships for Hispanic students; DACA recipients are encouraged to apply.",
          "category": "scholarship",
          "authority": "SHPE Foundation",
          "deadline": "Apr 30",
          "eligibility_tags": ["latinx", "stem", "daca", "undergrad", "graduate"],
          "schools": ["ccny"],
          "status": "active",
      },
      {
          "name": "Science Ambassador Scholarship",
          "url": "https://www.scienceambassadorscholarship.org/",
          "description": "Full-tuition scholarship for women studying STEM; DACA recipients are eligible.",
          "category": "scholarship",
          "authority": "Cards Against Humanity",
          "deadline": "Dec 13",
          "eligibility_tags": ["women", "stem", "daca", "undocumented"],
          "schools": ["ccny"],
          "status": "active",
      },
      {
          "name": "Paul & Daisy Soros Fellowships for New Americans",
          "url": "https://www.pdsoros.org/apply",
          "description": "Graduate school fellowships for immigrants and children of immigrants, including DACA recipients.",
          "category": "fellowship",
          "authority": "Paul & Daisy Soros Foundation",
          "deadline": "Oct 31",
          "amount_max": 90000,
          "eligibility_tags": ["immigrant", "graduate", "daca"],
          "schools": ["ccny"],
          "status": "active",
      },
      {
          "name": "Immigrants Rising Scholarship List",
          "url": "https://immigrantsrising.org/resource/scholarships/",
          "description": "Continuously updated database of scholarships that do not require proof of citizenship or legal status.",
          "category": "scholarship",
          "authority": "Immigrants Rising",
          "deadline": "rolling",
          "eligibility_tags": ["undocumented", "daca", "directory"],
          "schools": ["ccny", "all-cuny"],
          "status": "active",
      },
      {
          "name": "Mexican American Legal Defense Fund Scholarship List",
          "url": "https://www.maldef.org/resources/scholarship-resource-guide/",
          "description": "National list of scholarships for Latino students regardless of immigration status.",
          "category": "scholarship",
          "authority": "MALDEF",
          "deadline": "rolling",
          "eligibility_tags": ["latinx", "undocumented", "directory"],
          "schools": ["ccny"],
          "status": "active",
      },
      {
          "name": "Dream.US Community College Graduate Scholarship",
          "url": "https://www.thedream.us/scholarships/community-college-graduate-scholarship/",
          "description": "Helps Dreamers who are community college graduates complete a bachelor’s degree.",
          "category": "scholarship",
          "authority": "TheDream.US",
          "deadline": "seasonal",
          "eligibility_tags": ["daca", "undocumented", "transfer", "undergrad"],
          "schools": ["ccny"],
          "status": "active",
      },
      {
          "name": "Davis-Putter Scholarship Fund",
          "url": "https://www.davisputter.org/apply/",
          "description": "Need-based scholarships for student activists working for social justice, open to undocumented students.",
          "category": "scholarship",
          "authority": "Davis-Putter Fund",
          "deadline": "Apr 1",
          "amount_max": 15000,
          "eligibility_tags": ["activism", "financial-need", "undocumented"],
          "schools": ["ccny"],
          "status": "active",
      },
      {
          "name": "Jack Kent Cooke Undergraduate Transfer Scholarship",
          "url": "https://www.jkcf.org/our-scholarships/undergraduate-transfer-scholarship/",
          "description": "Up to $55,000 per year for high-achieving community college students transferring to four-year institutions; DACA eligible.",
          "category": "scholarship",
          "authority": "Jack Kent Cooke Foundation",
          "deadline": "Jan 11",
          "amount_max": 55000,
          "eligibility_tags": ["transfer", "daca", "undocumented", "undergrad"],
          "schools": ["ccny"],
          "status": "active",
      },
      {
          "name": "P.E.O. International Peace Scholarship",
          "url": "https://www.peointernational.org/about-peo-international-peace-scholarship-ips",
          "description": "Supports women from outside the United States pursuing graduate study; DACA and undocumented students studying on visas are eligible.",
          "category": "scholarship",
          "authority": "P.E.O. Foundation",
          "deadline": "Dec 15",
          "amount_max": 12500,
          "eligibility_tags": ["women", "graduate", "international"],
          "schools": ["ccny"],
          "status": "active",
      },
      {
          "name": "Dream.US Graduate Loan Fund (in partnership with Social Finance)",
          "url": "https://www.socialfinance.org/impact-investments/the-dream-us-graduate-loan-fund/",
          "description": "Affordable graduate school financing option for Dreamers pursuing advanced degrees.",
          "category": "grant",
          "authority": "Social Finance",
          "deadline": "rolling",
          "eligibility_tags": ["daca", "graduate", "finance"],
          "schools": ["ccny"],
          "status": "active",
      },
      # REMOVED: "CCNY Colin Powell School Dreamers Success Fund" (no active official page found)
  ]


def mentorships_payload() -> List[Dict[str, Any]]:
  return [
      {
          "name": "CCNY Immigrant Student Success Program Coaching",
          "url": "https://www.ccny.cuny.edu/immigrantstudentcenter",  # REPLACED
          "description": "One-on-one coaching with the CCNY Immigrant Student Success Program to navigate financial aid, legal referrals, and campus resources.",
          "category": "advising",
          "authority": "CCNY",
          "schools": ["ccny"],
          "contact_info": {"email": "iss@ccny.cuny.edu"},
          "status": "active",
      },
      {
          "name": "CCNY Dream Team Peer Mentorship",
          "url": "https://www.ccny.cuny.edu/immigrantstudentcenter/ccny-dream-team",  # UPDATED (still valid)
          "description": "Peer-to-peer mentorship community supporting undocumented and immigrant students at CCNY.",
          "category": "peer-support",
          "authority": "CCNY Dream Team",
          "schools": ["ccny"],
          "contact_info": {"instagram": "@ccnydreamteam"},
          "status": "active",
      },
      {
          "name": "CUNY Citizenship Now! Counseling",
          "url": "https://www.cuny.edu/about/administration/offices/communications-marketing/citizenship-now/",  # REPLACED
          "description": "Free immigration law consultations and referrals for CUNY students and families.",
          "category": "legal",
          "authority": "CUNY",
          "schools": ["ccny", "all-cuny"],
          "contact_info": {"phone": "646-664-9400"},
          "status": "active",
      },
      {
          "name": "Immigrants Rising Wellness Coaching",
          "url": "https://immigrantsrising.org/resource/mental-health-support/",
          "description": "Virtual mental health and career coaching for undocumented students nationwide.",
          "category": "advising",
          "authority": "Immigrants Rising",
          "schools": ["ccny"],
          "contact_info": {"email": "mentalhealth@immigrantsrising.org"},
          "status": "active",
      },
      {
          "name": "New York State Youth Leadership Council Mentorship",
          "url": "https://www.nysylc.org/programs",
          "description": "Leadership development and organizing mentorship for undocumented youth in New York.",
          "category": "peer-support",
          "authority": "NYSYLC",
          "schools": ["ccny"],
          "contact_info": {"email": "info@nysylc.org"},
          "status": "active",
      },
      {
          "name": "International Student & Scholar Services Advising",
          "url": "https://www.ccny.cuny.edu/isss",  # REPLACED
          "description": "Advising for international and non-citizen students on maintaining status, CPT/OPT, and campus employment.",
          "category": "advising",
          "authority": "CCNY",
          "schools": ["ccny"],
          "contact_info": {"office": "NAC 1-107"},
          "status": "active",
      },
      {
          "name": "CUNY Cultural Corps Professional Mentors",
          "url": "https://www.cuny.edu/culturalcorps/",
          "description": "Paid internships and mentorship in NYC arts and cultural institutions, open to DACA students.",
          "category": "coaching",
          "authority": "CUNY",
          "schools": ["ccny", "all-cuny"],
          "contact_info": {"email": "culturalcorps@cuny.edu"},
          "status": "active",
      },
      {
          "name": "Immigrant Student Success Program Legal Referral Network",
          "url": "https://www.ccny.cuny.edu/immigrantstudentcenter",  # REPLACED to hub (specific subpage not exposed)
          "description": "Connections to trusted immigration attorneys offering low-cost or pro-bono consultations for CCNY students.",
          "category": "legal",
          "authority": "CCNY",
          "schools": ["ccny"],
          "contact_info": {"email": "iss@ccny.cuny.edu"},
          "status": "active",
      },
      {
          "name": "Queens College DREAM Team Mentors",
          "url": "https://www.qc.cuny.edu/immi/the-queens-college-dream-team/",  # REPLACED
          "description": "CUNY-wide DREAM Team network offering mentorship circles and advocacy training for undocumented students.",
          "category": "peer-support",
          "authority": "CUNY DREAM Teams",
          "schools": ["ccny", "all-cuny"],
          "contact_info": {"instagram": "@cunydreamers"},
          "status": "active",
      },
      {
          "name": "NYU Immigrant Defense Initiative Hotline",
          "url": "https://www.law.nyu.edu/publicinterestlawcenter/immigrant-defense-initiative",
          "description": "Rapid response hotline providing legal screenings, know-your-rights trainings, and referrals for New Yorkers.",
          "category": "legal",
          "authority": "NYU Immigrant Defense Initiative",
          "schools": ["ccny"],
          "contact_info": {"phone": "212-998-6640"},
          "status": "active",
      },
  ]


def resources_payload() -> List[Dict[str, Any]]:
  return [
      {
          "name": "CUNY Citizenship Now! — Free Immigration Legal Services",
          "url": "https://www.cuny.edu/about/administration/offices/communications-marketing/citizenship-now/",  # REPLACED
          "description": "Flagship hub for free immigration legal services covering DACA, TPS, naturalization, fee waivers, and family petitions.",
          "category": "legal",
          "authority": "CUNY",
          "eligibility_tags": ["undocumented", "daca", "tps", "legal"],
          "schools": ["all-cuny"],
          "status": "active",
      },
      {
          "name": "Citizenship Now! — Services Overview",
          "url": "https://www.cuny.edu/about/administration/offices/communications-marketing/citizenship-now/services/",  # REPLACED
          "description": "Detailed breakdown of consultations, document preparation, and renewal support available through Citizenship Now!",
          "category": "legal",
          "authority": "CUNY",
          "eligibility_tags": ["immigration", "legal", "consultations"],
          "schools": ["all-cuny"],
          "status": "active",
      },
      {
          "name": "Citizenship Now! — Appointment & Hotline",
          "url": "https://www.cuny.edu/about/administration/offices/communications-marketing/citizenship-now/services/citizenship/",  # REPLACED
          "description": "Appointment portal and hotline/text line for accessing Citizenship Now! immigration legal assistance.",
          "category": "legal",
          "authority": "CUNY",
          "eligibility_tags": ["immigration", "legal", "hotline"],
          "schools": ["all-cuny"],
          "status": "active",
      },
      {
          "name": "Office of Undocumented & Immigrant Student Programs (CUNY)",
          "url": "https://www.cuny.edu/about/administration/offices/student-affairs/cuny-immigrant-student-success/",  # REPLACED
          "description": "CUNY central office coordinating programming, scholarships, and campus advocates for undocumented and immigrant students.",
          "category": "immigrant-support",
          "authority": "CUNY",
          "eligibility_tags": ["undocumented", "immigrant", "advocacy"],
          "schools": ["all-cuny"],
          "status": "active",
      },
      {
          "name": "NYS DREAM Act — CUNY Overview",
          "url": "https://www.cuny.edu/financial-aid/applying-for-financial-aid/jose-peralta-new-york-state-dream-act/",
          "description": "CUNY’s guide to NYS DREAM Act eligibility, required documentation, and application steps for state aid.",
          "category": "financial-aid",
          "authority": "CUNY",
          "eligibility_tags": ["undocumented", "financial-aid", "state-aid"],
          "schools": ["all-cuny"],
          "status": "active",
      },
      {
          "name": "TheDream.US at CUNY",
          "url": "https://www.cuny.edu/about/administration/offices/student-affairs/cuny-immigrant-student-success/paying-for-college/",  # REPLACED
          "description": "Scholarship windows, eligibility guidance, and campus contacts for TheDream.US partnership across CUNY.",
          "category": "financial-aid",
          "authority": "CUNY",
          "eligibility_tags": ["daca", "undocumented", "scholarship"],
          "schools": ["all-cuny"],
          "status": "active",
      },
      {
          "name": "CUNY CARES (Basic Needs)",
          "url": "https://www.cuny.edu/about/administration/offices/student-affairs/cuny-cares/",  # REPLACED
          "description": "System-wide hub for food, housing, emergency grants, and public benefits navigation across CUNY.",
          "category": "basic-needs",
          "authority": "CUNY",
          "eligibility_tags": ["basic-needs", "emergency-aid"],
          "schools": ["all-cuny"],
          "status": "active",
      },
      {
          "name": "Lehman Basic Needs Center",
          "url": "https://www.lehman.edu/student-affairs/basic-needs-center/",
          "description": "Lehman College hub for Petrie emergency grants, food security, and housing advocacy.",
          "category": "basic-needs",
          "authority": "Lehman College",
          "eligibility_tags": ["basic-needs", "emergency-aid"],
          "schools": ["lehman"],
          "status": "active",
      },
      {
          "name": "Graduate Center Student Emergency Grants",
          "url": "https://www.gc.cuny.edu/student-life/student-affairs/emergency-funding",
          "description": "Emergency funding program for CUNY Graduate Center students facing sudden financial hardship.",
          "category": "basic-needs",
          "authority": "CUNY Graduate Center",
          "eligibility_tags": ["graduate", "emergency-aid"],
          "schools": ["all-cuny"],
          "status": "active",
      },
      {
          "name": "Bronx CC Petrie Student Emergency Fund",
          "url": "https://www.bcc.cuny.edu/campus-resources/student-affairs/petrie-student-emergency-fund/",
          "description": "Emergency aid for Bronx Community College students navigating unexpected financial crises.",
          "category": "basic-needs",
          "authority": "Bronx Community College",
          "eligibility_tags": ["basic-needs", "emergency-aid"],
          "schools": ["bronxcc"],
          "status": "active",
      },
      {
          "name": "ISCRR — Immigrant Student Center (CCNY)",
          "url": "https://www.ccny.cuny.edu/immigrantstudentcenter",  # REPLACED
          "description": "Primary CCNY hub offering advising, events, and referrals for immigrant and undocumented students.",
          "category": "immigrant-support",
          "authority": "CCNY",
          "eligibility_tags": ["undocumented", "immigrant", "advising"],
          "schools": ["ccny"],
          "status": "active",
      },
      {
          "name": "ISCRR — Community Resources",
          "url": "https://www.ccny.cuny.edu/immigrantstudentcenter/community-resources",  # REPLACED
          "description": "Continuously updated list of scholarships, legal partners, and tuition guidance maintained by CCNY ISCRR.",
          "category": "immigrant-support",
          "authority": "CCNY",
          "eligibility_tags": ["resources", "community"],
          "schools": ["ccny"],
          "status": "active",
      },
      {
          "name": "ISCRR — Financial Aid for Undocumented Students",
          "url": "https://www.ccny.cuny.edu/immigrantstudentcenter/financial-aid",  # REPLACED
          "description": "CCNY guide to NYS DREAM, ASAP/SEEK, and budgeting tips for undocumented students.",
          "category": "financial-aid",
          "authority": "CCNY",
          "eligibility_tags": ["financial-aid", "undocumented"],
          "schools": ["ccny"],
          "status": "active",
      },
      {
          "name": "ISCRR — Scholarships for Undocumented & DACA Students",
          "url": "https://www.ccny.cuny.edu/immigrantstudentcenter/scholarships",  # REPLACED
          "description": "Curated scholarship list including TheDream.US and CCNY-specific awards.",
          "category": "financial-aid",
          "authority": "CCNY",
          "eligibility_tags": ["scholarship", "daca", "undocumented"],
          "schools": ["ccny"],
          "status": "active",
      },
      {
          "name": "ISCRR — Qualifying for In-State Tuition",
          "url": "https://www.ccny.cuny.edu/immigrantstudentcenter/qualifying-for-in-state-tuition",  # REPLACED
          "description": "Step-by-step instructions on proving NY residency or high-school pathways to secure in-state tuition at CCNY.",
          "category": "tuition",
          "authority": "CCNY",
          "eligibility_tags": ["tuition", "residency"],
          "schools": ["ccny"],
          "status": "active",
      },
      {
          "name": "CCNY Financial Aid — NYS DREAM Act",
          "url": "https://www.ccny.cuny.edu/financialaid/nys-dream-act",
          "description": "Campus financial aid office explainer for completing the NYS DREAM Act and understanding award disbursement.",
          "category": "financial-aid",
          "authority": "CCNY",
          "eligibility_tags": ["financial-aid", "state-aid"],
          "schools": ["ccny"],
          "status": "active",
      },
      {
          "name": "Benny’s Pantry & Gardens (CCNY)",
          "url": "https://www.ccny.cuny.edu/bennysfoodpantry",  # REPLACED
          "description": "CCNY pantry program providing groceries and produce support; includes volunteer and donation information.",
          "category": "basic-needs",
          "authority": "CCNY",
          "eligibility_tags": ["food-security", "basic-needs"],
          "schools": ["ccny"],
          "status": "active",
      },
      {
          "name": "Benny’s Pantry — About & Hours",
          "url": "https://www.ccny.cuny.edu/bennysfoodpantry/about-bennys-food-pantry",  # REPLACED
          "description": "Operational details for Benny’s Pantry, including hours, intake forms, and distribution process.",
          "category": "basic-needs",
          "authority": "CCNY",
          "eligibility_tags": ["food-security"],
          "schools": ["ccny"],
          "status": "active",
      },
      {
          "name": "Benny’s Pantry — CCNY CWE Location",
          "url": "https://www.ccny.cuny.edu/cwe/bennys",  # REPLACED
          "description": "Information about the downtown CWE campus pantry serving evening and adult learners.",
          "category": "basic-needs",
          "authority": "CCNY",
          "eligibility_tags": ["food-security", "adult-learners"],
          "schools": ["ccny"],
          "status": "active",
      },
      {
          "name": "CCNY Counseling Center",
          "url": "https://www.ccny.cuny.edu/counseling",
          "description": "Free, confidential counseling services, workshops, and crisis support for CCNY students.",
          "category": "counseling",
          "authority": "CCNY",
          "eligibility_tags": ["mental-health", "counseling"],
          "schools": ["ccny"],
          "status": "active",
      },
      {
          "name": "CCNY Psychological Center",
          "url": "https://www.ccny.cuny.edu/psychology/psychological-center",  # REPLACED
          "description": "Training clinic offering sliding-scale therapy and assessments for CCNY students and the local community.",
          "category": "counseling",
          "authority": "CCNY",
          "eligibility_tags": ["mental-health", "therapy"],
          "schools": ["ccny"],
          "status": "active",
      },
      {
          "name": "CWE Health & Wellness Resources",
          "url": "https://www.ccny.cuny.edu/cwe/health-wellness-resources",
          "description": "Curated counseling and crisis support resources for CCNY Center for Worker Education students.",
          "category": "counseling",
          "authority": "CCNY",
          "eligibility_tags": ["wellness", "adult-learners"],
          "schools": ["ccny"],
          "status": "active",
      },
      {
          "name": "CCNY Library Guide — Immigrants Support",
          "url": "https://library.ccny.cuny.edu/immigrants",  # REPLACED (more current library link)
          "description": "Librarian-maintained guide with legal, financial, and advising resources for immigrant students.",
          "category": "reference",
          "authority": "CCNY Libraries",
          "eligibility_tags": ["undocumented", "legal", "financial-aid"],
          "schools": ["ccny"],
          "status": "active",
      },
      {
          "name": "ISCRR — Guiding Principles",
          "url": "https://www.ccny.cuny.edu/immigrantstudentcenter/guiding-principles",  # REPLACED
          "description": "Values and commitments guiding CCNY’s Immigrant Student Center services.",
          "category": "reference",
          "authority": "CCNY",
          "eligibility_tags": ["immigrant", "advocacy"],
          "schools": ["ccny"],
          "status": "active",
      },
  ]


def school_hubs_payload() -> List[Dict[str, Any]]:
  return [
      {
          "school_code": "ccny",
          "display_name": "City College of New York",
          "campus_url": "https://www.ccny.cuny.edu/",
          "immigrant_center_url": "https://www.ccny.cuny.edu/immigrantstudentcenter",
          "discord_invite": None,
          "metadata": {
              "primaryColor": "#46166b",
              "secondaryColor": "#009ddc",
              "tagline": "Immigrant Student Success Program at CCNY",
              "address": "160 Convent Ave, New York, NY 10031",
          },
          "active": True,
      },
      {
          "school_code": "baruch",
          "display_name": "Baruch College",
          "campus_url": "https://www.baruch.cuny.edu/",
          "immigrant_center_url": None,
          "discord_invite": None,
          "metadata": {},
          "active": True,
      },
      {
          "school_code": "brooklyn",
          "display_name": "Brooklyn College",
          "campus_url": "https://www.brooklyn.cuny.edu/",
          "immigrant_center_url": None,
          "discord_invite": None,
          "metadata": {},
          "active": True,
      },
      {
          "school_code": "hunter",
          "display_name": "Hunter College",
          "campus_url": "https://www.hunter.cuny.edu/",
          "immigrant_center_url": None,
          "discord_invite": None,
          "metadata": {},
          "active": True,
      },
      {
          "school_code": "johnjay",
          "display_name": "John Jay College of Criminal Justice",
          "campus_url": "https://www.jjay.cuny.edu/",
          "immigrant_center_url": None,
          "discord_invite": None,
          "metadata": {},
          "active": True,
      },
      {
          "school_code": "lehman",
          "display_name": "Lehman College",
          "campus_url": "https://www.lehman.cuny.edu/",
          "immigrant_center_url": None,
          "discord_invite": None,
          "metadata": {},
          "active": True,
      },
      {
          "school_code": "queens",
          "display_name": "Queens College",
          "campus_url": "https://www.qc.cuny.edu/",
          "immigrant_center_url": None,
          "discord_invite": None,
          "metadata": {},
          "active": True,
      },
      {
          "school_code": "csi",
          "display_name": "College of Staten Island",
          "campus_url": "https://www.csi.cuny.edu/",
          "immigrant_center_url": None,
          "discord_invite": None,
          "metadata": {},
          "active": True,
      },
      {
          "school_code": "mec",
          "display_name": "Medgar Evers College",
          "campus_url": "https://www.mec.cuny.edu/",
          "immigrant_center_url": None,
          "discord_invite": None,
          "metadata": {},
          "active": True,
      },
      {
          "school_code": "york",
          "display_name": "York College",
          "campus_url": "https://www.york.cuny.edu/",
          "immigrant_center_url": None,
          "discord_invite": None,
          "metadata": {},
          "active": True,
      },
      {
          "school_code": "citytech",
          "display_name": "New York City College of Technology",
          "campus_url": "https://www.citytech.cuny.edu/",
          "immigrant_center_url": None,
          "discord_invite": None,
          "metadata": {},
          "active": True,
      },
      {
          "school_code": "sps",
          "display_name": "CUNY School of Professional Studies",
          "campus_url": "https://sps.cuny.edu/",
          "immigrant_center_url": None,
          "discord_invite": None,
          "metadata": {},
          "active": True,
      },
      {
          "school_code": "macaulay",
          "display_name": "Macaulay Honors College",
          "campus_url": "https://macaulay.cuny.edu/",
          "immigrant_center_url": None,
          "discord_invite": None,
          "metadata": {},
          "active": True,
      },
      {
          "school_code": "bmcc",
          "display_name": "Borough of Manhattan Community College",
          "campus_url": "https://www.bmcc.cuny.edu/",
          "immigrant_center_url": None,
          "discord_invite": None,
          "metadata": {},
          "active": True,
      },
      {
          "school_code": "bronxcc",
          "display_name": "Bronx Community College",
          "campus_url": "https://www.bcc.cuny.edu/",
          "immigrant_center_url": None,
          "discord_invite": None,
          "metadata": {},
          "active": True,
      },
      {
          "school_code": "hostos",
          "display_name": "Hostos Community College",
          "campus_url": "https://www.hostos.cuny.edu/",
          "immigrant_center_url": None,
          "discord_invite": None,
          "metadata": {},
          "active": True,
      },
      {
          "school_code": "kingsborough",
          "display_name": "Kingsborough Community College",
          "campus_url": "https://www.kbcc.cuny.edu/",
          "immigrant_center_url": None,
          "discord_invite": None,
          "metadata": {},
          "active": True,
      },
      {
          "school_code": "laguardia",
          "display_name": "LaGuardia Community College",
          "campus_url": "https://www.laguardia.edu/",
          "immigrant_center_url": None,
          "discord_invite": None,
          "metadata": {},
          "active": True,
      },
      {
          "school_code": "queensborough",
          "display_name": "Queensborough Community College",
          "campus_url": "https://www.qcc.cuny.edu/",
          "immigrant_center_url": None,
          "discord_invite": None,
          "metadata": {},
          "active": True,
      },
      {
          "school_code": "guttman",
          "display_name": "Guttman Community College",
          "campus_url": "https://guttman.cuny.edu/",
          "immigrant_center_url": None,
          "discord_invite": None,
          "metadata": {},
          "active": True,
      },
  ]


def upsert(client: Client, table: str, rows: List[Dict[str, Any]], conflict: str) -> None:
  if not rows:
    return
  # Supabase upsert expects plain dicts with JSON-serializable contents.
  response = client.table(table).upsert(rows, on_conflict=conflict).execute()
  error = getattr(response, "error", None)
  if error:
    raise RuntimeError(f"Failed to upsert into {table}: {error}")


def main() -> None:
  load_env()
  client = get_client()

  school_hubs = school_hubs_payload()
  scholarships = scholarships_payload()
  mentorships = mentorships_payload()
  resources = resources_payload()

  mark_inactive_dead_links(scholarships, label="scholarships")
  mark_inactive_dead_links(mentorships, label="mentorships")
  mark_inactive_dead_links(resources, label="resources")

  upsert(client, "school_hubs", school_hubs, conflict="school_code")
  upsert(client, "scholarships", scholarships, conflict="url")
  upsert(client, "mentorships", mentorships, conflict="name")
  upsert(client, "resources", resources, conflict="name")

  print("✅ Seed data loaded successfully.")


if __name__ == "__main__":
  main()
