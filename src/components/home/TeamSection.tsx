import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { resolveTeamImageUrl } from "@/lib/teamImages";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Linkedin,
  Github,
  Globe,
  Facebook,
  Instagram,
  Mail,
  MapPin,
  Briefcase,
  GraduationCap,
  Phone,
} from "lucide-react";

export interface TeamMember {
  id: string;
  full_name: string;
  role: string;
  image_url: string | null;
  short_bio: string | null;
  description: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  department: string | null;
  experience: string | null;
  education: string | null;
  skills: string[];
  linkedin_url: string | null;
  github_url: string | null;
  portfolio_url: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  display_order: number;
  is_featured: boolean;
  is_active: boolean;
}

function SocialLinks({ member, size = "w-4 h-4" }: { member: TeamMember; size?: string }) {
  const links = [
    { url: member.linkedin_url, Icon: Linkedin, label: "LinkedIn" },
    { url: member.github_url, Icon: Github, label: "GitHub" },
    { url: member.portfolio_url, Icon: Globe, label: "Portfolio" },
    { url: member.facebook_url, Icon: Facebook, label: "Facebook" },
    { url: member.instagram_url, Icon: Instagram, label: "Instagram" },
  ].filter((l) => Boolean(l.url));

  if (links.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      {links.map(({ url, Icon, label }) => (
        <a
          key={label}
          href={url as string}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${member.full_name} on ${label}`}
          className="p-2 rounded-full bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all hover:-translate-y-0.5"
        >
          <Icon className={size} />
        </a>
      ))}
    </div>
  );
}

export function TeamMemberModal({
  member,
  onClose,
}: {
  member: TeamMember | null;
  onClose: () => void;
}) {
  const [image, setImage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (member) {
      resolveTeamImageUrl(member.image_url).then((url) => {
        if (active) setImage(url);
      });
    } else {
      setImage(null);
    }
    return () => {
      active = false;
    };
  }, [member]);

  return (
    <Dialog open={Boolean(member)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        {member && (
          <>
            <DialogHeader>
              <DialogTitle>{member.full_name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="w-32 h-32 rounded-xl overflow-hidden bg-muted flex items-center justify-center text-2xl font-bold shrink-0">
                  {image ? (
                    <img src={image} alt={`${member.full_name}, ${member.role}`} className="w-full h-full object-cover" />
                  ) : (
                    member.full_name.slice(0, 2).toUpperCase()
                  )}
                </div>
                <div className="space-y-2">
                  <p className="text-primary font-medium">{member.role}</p>
                  {member.short_bio && <p className="text-sm text-muted-foreground">{member.short_bio}</p>}
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {member.department && (
                      <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" />{member.department}</span>
                    )}
                    {member.location && (
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{member.location}</span>
                    )}
                    {member.email && (
                      <a href={`mailto:${member.email}`} className="flex items-center gap-1 hover:text-primary">
                        <Mail className="w-3 h-3" />{member.email}
                      </a>
                    )}
                    {member.phone && (
                      <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{member.phone}</span>
                    )}
                  </div>
                  <SocialLinks member={member} />
                </div>
              </div>

              {member.description && (
                <p className="text-sm leading-relaxed whitespace-pre-line">{member.description}</p>
              )}

              {member.skills?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {member.skills.map((s) => (
                    <Badge key={s} variant="secondary">{s}</Badge>
                  ))}
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2 text-sm">
                {member.experience && (
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                      <Briefcase className="w-3 h-3" /> Experience
                    </p>
                    {member.experience}
                  </div>
                )}
                {member.education && (
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                      <GraduationCap className="w-3 h-3" /> Education
                    </p>
                    {member.education}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function TeamSection() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [images, setImages] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<TeamMember | null>(null);

  useEffect(() => {
    let active = true;
    supabase
      .from("team_members")
      .select("*")
      .eq("is_active", true)
      .order("display_order", { ascending: true })
      .then(async ({ data }) => {
        if (!active || !data) return;
        const list = data as TeamMember[];
        setMembers(list);
        const resolved: Record<string, string> = {};
        await Promise.all(
          list.map(async (m) => {
            const url = await resolveTeamImageUrl(m.image_url);
            if (url) resolved[m.id] = url;
          }),
        );
        if (active) setImages(resolved);
      });
    return () => {
      active = false;
    };
  }, []);

  if (members.length === 0) return null;

  return (
    <section id="team" className="py-16 sm:py-24">
      <div className="container px-4 sm:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold mb-3">Meet the Team</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            The people building SmartMine — data scientists, engineers and researchers.
          </p>
        </div>

        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {members.map((m, i) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              className="group rounded-2xl border border-border bg-card overflow-hidden transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/10"
            >
              <div className="aspect-square overflow-hidden bg-muted flex items-center justify-center text-3xl font-bold text-muted-foreground">
                {images[m.id] ? (
                  <img
                    src={images[m.id]}
                    alt={`${m.full_name}, ${m.role}`}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  m.full_name.slice(0, 2).toUpperCase()
                )}
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <h3 className="font-semibold leading-tight">{m.full_name}</h3>
                  <p className="text-sm text-primary">{m.role}</p>
                </div>
                {m.short_bio && (
                  <p className="text-xs text-muted-foreground line-clamp-3">{m.short_bio}</p>
                )}
                {m.skills?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {m.skills.slice(0, 3).map((s) => (
                      <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between pt-1">
                  <SocialLinks member={m} />
                  <Button variant="ghost" size="sm" onClick={() => setSelected(m)}>
                    View Profile
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <TeamMemberModal member={selected} onClose={() => setSelected(null)} />
    </section>
  );
}
