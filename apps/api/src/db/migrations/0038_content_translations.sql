CREATE TABLE "charity_translations" (
	"charity_id" uuid NOT NULL,
	"locale" text NOT NULL,
	"name" text,
	"description" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "charity_translations_charity_id_locale_pk" PRIMARY KEY("charity_id","locale")
);
--> statement-breakpoint
CREATE TABLE "gallery_photo_translations" (
	"photo_id" uuid NOT NULL,
	"locale" text NOT NULL,
	"caption" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "gallery_photo_translations_photo_id_locale_pk" PRIMARY KEY("photo_id","locale")
);
--> statement-breakpoint
CREATE TABLE "help_article_translations" (
	"article_id" uuid NOT NULL,
	"locale" text NOT NULL,
	"question" text,
	"answer_md" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "help_article_translations_article_id_locale_pk" PRIMARY KEY("article_id","locale")
);
--> statement-breakpoint
CREATE TABLE "product_faq_translations" (
	"faq_id" uuid NOT NULL,
	"locale" text NOT NULL,
	"question" text,
	"answer" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_faq_translations_faq_id_locale_pk" PRIMARY KEY("faq_id","locale")
);
--> statement-breakpoint
CREATE TABLE "product_spec_translations" (
	"spec_id" uuid NOT NULL,
	"locale" text NOT NULL,
	"label" text,
	"value" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_spec_translations_spec_id_locale_pk" PRIMARY KEY("spec_id","locale")
);
--> statement-breakpoint
CREATE TABLE "size_guide_translations" (
	"size_guide_id" uuid NOT NULL,
	"locale" text NOT NULL,
	"title" text,
	"rows" jsonb,
	"howto_md" text,
	"tip" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "size_guide_translations_size_guide_id_locale_pk" PRIMARY KEY("size_guide_id","locale")
);
--> statement-breakpoint
ALTER TABLE "product_translations" ADD COLUMN "delivery_note" text;--> statement-breakpoint
ALTER TABLE "charity_translations" ADD CONSTRAINT "charity_translations_charity_id_charities_id_fk" FOREIGN KEY ("charity_id") REFERENCES "public"."charities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gallery_photo_translations" ADD CONSTRAINT "gallery_photo_translations_photo_id_gallery_photos_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."gallery_photos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "help_article_translations" ADD CONSTRAINT "help_article_translations_article_id_help_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."help_articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_faq_translations" ADD CONSTRAINT "product_faq_translations_faq_id_product_faqs_id_fk" FOREIGN KEY ("faq_id") REFERENCES "public"."product_faqs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_spec_translations" ADD CONSTRAINT "product_spec_translations_spec_id_product_specs_id_fk" FOREIGN KEY ("spec_id") REFERENCES "public"."product_specs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "size_guide_translations" ADD CONSTRAINT "size_guide_translations_size_guide_id_size_guides_id_fk" FOREIGN KEY ("size_guide_id") REFERENCES "public"."size_guides"("id") ON DELETE cascade ON UPDATE no action;