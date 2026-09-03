package com.ontrack.backend.service;

import com.ontrack.backend.exception.InvalidResumeFileException;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.apache.poi.xwpf.usermodel.XWPFRun;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ResumeFileExtractorTest {

    private final ResumeFileExtractor extractor = new ResumeFileExtractor();

    @Test
    void extractsTextFromAPdfFile() throws IOException {
        byte[] pdfBytes = buildPdf("Jane Doe - Software Engineer");
        MockMultipartFile file = new MockMultipartFile("file", "resume.pdf", "application/pdf", pdfBytes);

        String text = extractor.extractText(file);

        assertThat(text).contains("Jane Doe - Software Engineer");
    }

    @Test
    void extractsTextFromADocxFile() throws IOException {
        byte[] docxBytes = buildDocx("Jane Doe - Software Engineer");
        MockMultipartFile file = new MockMultipartFile(
                "file", "resume.docx",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document", docxBytes);

        String text = extractor.extractText(file);

        assertThat(text).contains("Jane Doe - Software Engineer");
    }

    @Test
    void rejectsAnUnsupportedFileType() {
        MockMultipartFile file = new MockMultipartFile("file", "resume.txt", "text/plain", "hello".getBytes());

        assertThatThrownBy(() -> extractor.extractText(file))
                .isInstanceOf(InvalidResumeFileException.class);
    }

    @Test
    void rejectsAFileWithNoName() {
        MockMultipartFile file = new MockMultipartFile("file", null, "application/pdf", new byte[0]);

        assertThatThrownBy(() -> extractor.extractText(file))
                .isInstanceOf(InvalidResumeFileException.class);
    }

    private byte[] buildPdf(String text) throws IOException {
        try (PDDocument document = new PDDocument()) {
            PDPage page = new PDPage();
            document.addPage(page);
            try (PDPageContentStream contentStream = new PDPageContentStream(document, page)) {
                contentStream.beginText();
                contentStream.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 12);
                contentStream.newLineAtOffset(50, 700);
                contentStream.showText(text);
                contentStream.endText();
            }
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            document.save(out);
            return out.toByteArray();
        }
    }

    private byte[] buildDocx(String text) throws IOException {
        try (XWPFDocument document = new XWPFDocument()) {
            XWPFParagraph paragraph = document.createParagraph();
            XWPFRun run = paragraph.createRun();
            run.setText(text);
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            document.write(out);
            return out.toByteArray();
        }
    }
}
