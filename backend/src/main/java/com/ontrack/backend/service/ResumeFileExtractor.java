package com.ontrack.backend.service;

import com.ontrack.backend.exception.InvalidResumeFileException;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.xwpf.extractor.XWPFWordExtractor;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Locale;

/**
 * Pulls plain text out of an uploaded PDF or DOCX resume - entirely in memory, for the
 * duration of a single request. The file's bytes are never written to disk or a database;
 * only the extracted (and then Gemini-normalized) text is ever persisted, via the existing
 * resumeText column.
 */
@Component
public class ResumeFileExtractor {

    public String extractText(MultipartFile file) {
        String filename = file.getOriginalFilename() == null ? "" : file.getOriginalFilename().toLowerCase(Locale.ROOT);

        try {
            if (filename.endsWith(".pdf")) {
                return extractPdf(file);
            } else if (filename.endsWith(".docx")) {
                return extractDocx(file);
            }
            throw new InvalidResumeFileException("Only PDF and DOCX files are supported");
        } catch (IOException e) {
            throw new InvalidResumeFileException("Couldn't read the uploaded file: " + e.getMessage());
        }
    }

    private String extractPdf(MultipartFile file) throws IOException {
        try (PDDocument document = Loader.loadPDF(file.getBytes())) {
            return new PDFTextStripper().getText(document);
        }
    }

    private String extractDocx(MultipartFile file) throws IOException {
        try (XWPFDocument document = new XWPFDocument(file.getInputStream());
             XWPFWordExtractor extractor = new XWPFWordExtractor(document)) {
            return extractor.getText();
        }
    }
}
