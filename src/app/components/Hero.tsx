"use client";
import { motion } from "framer-motion";
import { ArrowRight, GraduationCap, Handshake, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { buttonCn } from "@/app/components/ui/Button";
import IntakeWizard from "@/app/components/IntakeWizard";

type School = { code: string; name: string };

export default function Hero({ schools }: { schools?: School[] }) {
  return (
    <section className="relative mx-auto max-w-7xl px-4 pt-16 md:pt-24">
      <div className="mx-auto grid max-w-3xl gap-8 text-center">
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-3xl font-semibold leading-tight tracking-tight md:text-5xl text-heading"
        >
          Find help fast at CUNY
          <span className="block">Scholarships, mentors, and campus resources</span>
        </motion.h1>

        <p className="text-base md:text-lg text-text/85">
          Browse the resource directory, visit your school hub, or try the CCNY agent demo. All undocu‑friendly, with
          verified links and clear deadlines.
        </p>
        <p className="text-xs text-text/70">
          ¿Prefieres español? Puedes hacer preguntas en español y revisaremos los recursos juntos.
        </p>

        {/* Centered CTA */}
        <div className="mx-auto flex w-full max-w-xl items-center justify-center gap-2">
          <Link href="/resources" className={buttonCn({ variant: "outline", size: "md" })}>
            Browse Directory
          </Link>
          <Link href="/schools" className={buttonCn({ variant: "outline", size: "md" })}>
            Find Your School
          </Link>
          <Link href="/ccny" className={buttonCn({ variant: "ghost", size: "md" })}>
            CCNY Agent Demo
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>

        <IntakeWizard variant="hero" schools={schools} />

        {/* Three quick highlights */}
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-3 pt-8 md:grid-cols-3">
          {[
            { icon: GraduationCap, title: "Resource Directory", desc: "Filter scholarships, mentorships, and benefits by school & deadline." },
            { icon: Handshake, title: "School Hubs", desc: "Curated links and deadlines for each CUNY campus." },
            { icon: ShieldCheck, title: "CCNY Agent Demo", desc: "Ask questions and get verified links in a chat UI." },
          ].map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="rounded-2xl border border-[color:rgb(var(--glass-border)/0.18)] bg-card p-5 shadow-card text-center"
            >
              <div className="flex flex-col items-center">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[color:rgb(var(--primary)/0.08)]">
                  <f.icon className="h-5 w-5 text-heading" />
                </span>
                <h3 className="mt-3 text-sm font-semibold text-heading">{f.title}</h3>
                <p className="mt-1 text-sm text-text/80">{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
