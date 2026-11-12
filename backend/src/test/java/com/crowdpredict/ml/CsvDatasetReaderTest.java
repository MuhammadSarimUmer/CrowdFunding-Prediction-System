package com.crowdpredict.ml;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import com.crowdpredict.web.error.ApiException;

class CsvDatasetReaderTest {

    @TempDir
    Path directory;

    @Test
    void parsesTheCanonicalHeaderAndSkipsUnusableRows() throws IOException {
        Path csv = write("""
                goalAmount,durationDays,rewardCount,descriptionLength,titleLength,backerCount,categoryId,country,success
                5000,30,3,220,40,80,1,US,1
                9000,45,2,180,30,10,2,GB,0
                1000,1,1,90,10,0,3,PK,1
                2000,20,2,100,20,4,4,DE,0
                3000,25,3,110,25,6,5,FR,1
                4000,28,4,120,30,8,6,CA,0
                6000,32,5,130,35,12,7,IN,1
                7000,36,2,140,40,14,1,AU,0
                8000,40,3,150,45,16,2,SG,1
                9500,50,4,160,50,18,3,AE,0
                not-a-number,30,1,100,20,0,1,US,1
                7000,20,1,100,20,0,1,US,2
                """);

        CsvTrainingData data = CsvDatasetReader.read(csv, "sample.csv");

        assertEquals(10, data.rowCount());
        assertEquals(9, data.featureCount());
        assertEquals(5000, data.features()[0][0]);
        assertEquals(30, data.features()[0][1]);
        assertEquals(1, data.labels()[0]);
        assertEquals(0, data.labels()[1]);
        assertEquals(FeatureSpec.COUNTRIES.indexOf("GB"), data.features()[1][8]);
    }

    @Test
    void acceptsRealWorldHeaderAliases() throws IOException {
        Path csv = write("""
                Goal Amount,days,rewards,backers,label,country
                5000,30,3,80,1,US
                9000,45,2,10,0,GB
                2000,25,1,4,1,PK
                3000,20,5,9,0,DE
                4000,35,4,40,1,FR
                6000,28,3,30,0,CA
                8000,42,2,12,1,IN
                1500,18,1,3,0,AU
                2500,31,2,6,1,SG
                3500,26,3,20,0,AE
                """);

        CsvTrainingData data = CsvDatasetReader.read(csv, "kaggle-export.csv");

        assertEquals(10, data.rowCount());
        assertEquals(5000, data.features()[0][0]);
        assertEquals(30, data.features()[0][1]);
        assertEquals(3, data.features()[0][3]);
        assertEquals(80, data.features()[0][6]);
    }

    @Test
    void rejectsMissingSuccessColumn() throws IOException {
        Path csv = write("""
                goalAmount,durationDays
                5000,30
                9000,45
                """);

        ApiException error = assertThrows(ApiException.class,
                () -> CsvDatasetReader.read(csv, "missing-label.csv"));

        assertEquals(400, error.getStatus());
        assertTrue(error.getErrors().containsKey("file"));
    }

    @Test
    void rejectsDatasetsWithOneClassOnly() throws IOException {
        Path csv = write("""
                goalAmount,durationDays,success
                5000,30,1
                9000,45,1
                1000,20,1
                2000,25,1
                3000,28,1
                4000,32,1
                6000,35,1
                7000,38,1
                8000,40,1
                9500,44,1
                """);

        ApiException error = assertThrows(ApiException.class,
                () -> CsvDatasetReader.read(csv, "one-class.csv"));

        assertEquals(400, error.getStatus());
        assertTrue(error.getErrors().get("file").contains("both funded and failed"));
    }

    @Test
    void rejectsTooFewRows() throws IOException {
        Path csv = write("""
                goalAmount,durationDays,success
                5000,30,1
                9000,45,0
                """);

        assertThrows(ApiException.class, () -> CsvDatasetReader.read(csv, "tiny.csv"));
    }

    private Path write(String content) throws IOException {
        Path file = directory.resolve("dataset.csv");
        Files.writeString(file, content, StandardCharsets.UTF_8);
        return file;
    }
}
